// scripts/fixJsonBible.js
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);

const DRY_RUN =args.includes("--dry-run");
const PRETTY =args.includes("--pretty");
const WRITE_LOG = args.includes("--log");

const VALID_FLAGS = new Set([
  "--dry-run",
  "--pretty",
  "--log",
  "--help",
  "-h"
]);


function showHelp(error) {
  if (error) {
    console.error(`❌ ${error}\n`);
  }

  console.log(`
📖 JSON Bible Fixer for FreeShow

Usage:
  node fixJsonBible.js [options]

Options:
  --log           Write a log file (fix-log.txt)
  --dry-run       Analyze files without writing output
  --pretty        Write formatted (pretty-printed) JSON
  --help, -h      Show this help message

Examples:
  node fixJsonBible.js
  node fixJsonBible.js --dry-run
  node fixJsonBible.js --pretty
  node fixJsonBible.js --dry-run --pretty

Notes:
  • The script only outputs Bibles that actually need fixing
  • Always recheck affected verses using the original/reference Bible
  • Logs include detected empty/missing verses per Bible

`);
}

for (const arg of args) {
  if (!VALID_FLAGS.has(arg)) {
    showHelp(`Unknown flag: ${arg}`);
    process.exit(1);
  }
}

if (args.includes("--help") || args.includes("-h")) {
  showHelp();
  process.exit(0);
}

function processVerses(verses, context, log) {
  const result = [];
  let lastVerse = null;
  let expectedNumber = null;
  let fixed = false;

  for (const v of verses) {
    if (expectedNumber === null) {
      expectedNumber = v.number;
    }

    // 🔍 Missing verse numbers
    if (v.number > expectedNumber && lastVerse) {
      fixed = true;
      lastVerse.endNumber = v.number - 1;

      log.push({
        type: "missing",
        start: expectedNumber,
        end: v.number - 1,
        context
      });

    }

    // 🔍 Empty verse text
    if (!v.text || v.text.trim() === "") {
      if (lastVerse) {
        fixed = true;
        lastVerse.endNumber = v.number;

        log.push({
          type: "empty",
          start: v.number,
          end: v.number,
          context
        });

      }
    } else {
      result.push(v);
      lastVerse = v;
    }

    expectedNumber = v.number + 1;
  }

  return { verses: result, fixed };
}

// ===== Paths =====
const inputDir = path.resolve("../Converted");
const outputDir = path.resolve("../Fixed");

if (!DRY_RUN) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let fixedCount = 0;
let invalidCount = 0;

const logLines = [];
function getTimestamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-");
}

const logFilePath = path.resolve(`fix-log-${getTimestamp()}.txt`);

function writeLog(line) {
  if (!WRITE_LOG) return;
  logLines.push(line);
}


const modeMessage = DRY_RUN
  ? "🧪 DRY-RUN MODE: No files will be written."
  : "🛠 Fix mode enabled. Writing output files.";

console.log(modeMessage + "\n");
writeLog(modeMessage);
writeLog("");


for (const file of fs.readdirSync(inputDir)) {
  if (!file.endsWith(".json")) continue;

  const filePath = path.join(inputDir, file);
  let bible;

  // 🛡 Safe JSON parsing
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    bible = JSON.parse(raw);
  } catch (err) {
    invalidCount++;

    let location = "";
    if (err.message.includes("position")) {
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const pos = Number(match[1]);
        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.slice(0, pos).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        location = ` (line ${line}, column ${column})`;
      }
    }

    const errorMsg =
      `❌ Invalid JSON: ${file}${location}\n   → ${err.message}`;

    console.error(errorMsg + "\n");
    writeLog(errorMsg);
    writeLog("");

    continue; // ⬅️ move on to next file
  }

  let bibleFixed = false;
  const log = [];

  for (const book of bible.books || []) {
    for (const chapter of book.chapters || []) {
      const context = `${book.name} ${chapter.number}`;
      const result = processVerses(chapter.verses || [], context, log);

      if (result.fixed) {
        chapter.verses = result.verses;
        bibleFixed = true;
      }
    }
  }

  function printGroupedLog(log) {
    const grouped = [];

    for (const entry of log) {
      const last = grouped[grouped.length - 1];

      if (
        last &&
        last.type === entry.type &&
        last.context === entry.context &&
        last.end + 1 === entry.start
      ) {
        // extend range
        last.end = entry.end;
      } else {
        grouped.push({ ...entry });
      }
    }

    for (const g of grouped) {
      const label =
        g.type === "empty"
          ? "Empty verse"
          : "Missing verses";

      const range =
        g.start === g.end ? g.start : `${g.start}-${g.end}`;

    const line = `📌 ${label} ${range} at ${g.context}`;
    console.log(line);
    if (writeLog) writeLog(line);

    }
  }

  if (bibleFixed) {
    fixedCount++;

    const header = `📖 ${DRY_RUN ? "Needs fixing" : "Fixed"}: ${file}`;
    console.log(header);
    writeLog(header);

    printGroupedLog(log, writeLog);


    if (!DRY_RUN) {
      const outputName = `fixed${file}`;
      const outputPath = path.join(outputDir, outputName);
      fs.writeFileSync(
        outputPath,
        PRETTY ? JSON.stringify(bible, null, 2) : JSON.stringify(bible),
        "utf8"
      );

    }

    console.log("");
  }
}

const summary = `
Done.
📘 ${fixedCount} Bible(s) ${DRY_RUN ? "would need fixing" : "needed fixing"}
⚠️  ${invalidCount} file(s) had invalid JSON and were skipped.
🔎 Reminder: ${
  DRY_RUN
    ? "These changes would affect verse ranges. Please double-check them against the original/reference Bible."
    : "These changes affected verse ranges. Please double-check them against the original/reference Bible."
}
🧾 Output format: ${PRETTY ? "Pretty-printed JSON" : "Compact JSON"}
`;

console.log(summary);
writeLog(summary);

if (WRITE_LOG && logLines.length) {
  fs.writeFileSync(logFilePath, logLines.join("\n"), "utf8");
  console.log(`📝 Log written to ${logFilePath}`);
}
