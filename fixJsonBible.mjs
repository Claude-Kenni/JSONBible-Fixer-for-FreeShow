import fs from "fs";
import path from "path";

// ===== Configuration & Arguments =====
const args = process.argv.slice(2);

const FLAGS = {
  DRY_RUN: args.includes("--dry-run"),
  WRITE_LOG: args.includes("--log"),
  HELP: args.includes("--help") || args.includes("-h")
};

// Paths
const INPUT_DIR = path.resolve("../Converted");
const OUTPUT_DIR = path.resolve("../Fixed");
const LOGS_DIR = path.resolve("./logs"); // Centralized logs folder

// ===== Help Menu =====
function showHelp(error) {
  if (error) console.error(`❌ Error: ${error}\n`);
  console.log(`
📖 JSON/FSB Bible Fixer for FreeShow

Usage:
  node fixJsonBible.js [options]

Options:
  --log        Write a log file (in ./logs/)
  --dry-run    Analyze files without writing output
  --help, -h   Show this help message

Notes:
  • Output is always compact (minified) JSON to save space.
  • The script only outputs Bibles that actually need fixing.
`);
}

// ===== 🛡️ Argument Validation =====
const ALLOWED_FLAGS = ["--dry-run", "--log", "--help", "-h"];

for (const arg of args) {
  // If it looks like a flag (starts with -) but isn't allowed
  if (arg.startsWith("-") && !ALLOWED_FLAGS.includes(arg)) {
    showHelp(`Unknown argument: "${arg}"`);
    process.exit(1);
  }
}

if (FLAGS.HELP) {
  showHelp();
  process.exit(0);
}

// ===== 📝 Logging System (DRY Principle) =====

const logLines = [];
const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const logFilePath = path.join(LOGS_DIR, `fix-log-${timestamp()}.txt`);

function writeLog(line) {
  if (FLAGS.WRITE_LOG) logLines.push(line);
}

function logMessage(msg, level = "info") {
  // Console output
  switch (level) {
    case "warn": console.warn(msg); break;
    case "error": console.error(msg); break;
    default: console.log(msg);
  }
  // File buffer
  writeLog(msg);
}

function flushLogs() {
  if (FLAGS.WRITE_LOG && logLines.length) {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.writeFileSync(logFilePath, logLines.join("\n") + "\n", "utf8");
    console.log(`\n📝 Log written to ${logFilePath}`);
  }
}

// ===== 📂 File Handling System =====

// Validate Input
if (!fs.existsSync(INPUT_DIR)) {
  logMessage(`❌ Input folder not found: ${INPUT_DIR}`, "error");
  logMessage(`👉 Please create "Converted" folder or check path.`, "warn");
  process.exit(1);
}

// Prepare Output
if (!FLAGS.DRY_RUN && !fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get Files
const inputFiles = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".json") || f.endsWith(".fsb"));

if (!inputFiles.length) {
  logMessage(`⚠️ No JSON or FSB files found in "${INPUT_DIR}"`, "warn");
  process.exit(0);
}

/**
 * Reads a file and determines if it is a standard JSON object 
 * or an FSB structure (Array: [ID, Data]).
 */
function readBibleFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let raw;
  try {
    raw = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON syntax`);
  }

  // ROBUST DETECTION:
  const isFsbStructure = Array.isArray(raw) && 
                         raw.length === 2 && 
                         typeof raw[0] === "string" && 
                         typeof raw[1] === "object" &&
                         raw[1] !== null;

  if (isFsbStructure) {
    return { type: "fsb", id: raw[0], data: raw[1] };
  } else if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return { type: "json", id: null, data: raw };
  } else {
    throw new Error(`Unknown structure. Expected {object} or ["id", {object}].`);
  }
}

/**
 * Writes the file back to disk, preserving the original structure (JSON vs FSB).
 * Always writes in COMPACT format.
 */
function writeBibleFile(filePath, bibleWrapper) {
  let outputData;
  
  // Reconstruct FSB array if necessary
  if (bibleWrapper.type === "fsb") {
    outputData = [bibleWrapper.id, bibleWrapper.data];
  } else {
    outputData = bibleWrapper.data;
  }

  // Always compact
  const jsonString = JSON.stringify(outputData);

  fs.writeFileSync(filePath, jsonString, "utf8");
}

// ===== 🧠 Logic: Bible Fixing =====

function processVerses(verses, context, verseLog) {
  const result = [];
  let lastVerse = null;
  let expectedNumber = null;
  let fixed = false;

  for (const v of verses) {
    if (expectedNumber === null) expectedNumber = v.number;

    // 🔍 Missing verse numbers (Gaps)
    if (v.number > expectedNumber && lastVerse) {
      fixed = true;
      lastVerse.endNumber = v.number - 1; // Extend previous verse to cover gap

      verseLog.push({
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
        lastVerse.endNumber = v.number; // Merge into previous verse

        verseLog.push({
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

function logGroupedErrors(verseLog) {
  const grouped = [];

  // Group consecutive errors
  for (const entry of verseLog) {
    const last = grouped[grouped.length - 1];
    if (last && last.type === entry.type && last.context === entry.context && last.end + 1 === entry.start) {
      last.end = entry.end; // Extend range
    } else {
      grouped.push({ ...entry });
    }
  }

  // Print errors
  for (const g of grouped) {
    const label = g.type === "empty" ? "Empty verse" : "Missing verses";
    const range = g.start === g.end ? g.start : `${g.start}-${g.end}`;
    logMessage(`   📌 ${label} ${range} at ${g.context}`);
  }
}

// ===== 🚀 Main Execution =====

logMessage(`📂 Input:  ${INPUT_DIR}`);
logMessage(`📂 Output: ${OUTPUT_DIR}`);
logMessage(FLAGS.DRY_RUN 
  ? "🧪 DRY-RUN MODE: No files will be written.\n" 
  : "🛠  Fix mode enabled. Writing output files (Compact).\n");

let fixedCount = 0;
let invalidCount = 0;

for (const file of inputFiles) {
  const filePath = path.join(INPUT_DIR, file);
  let bibleWrapper;

  // 1. Read
  try {
    bibleWrapper = readBibleFile(filePath);
  } catch (err) {
    invalidCount++;
    logMessage(`❌ Skipped ${file}: ${err.message}`, "error");
    continue;
  }

  // 2. Process
  const bible = bibleWrapper.data; // Work on the inner data object
  let bibleWasModified = false;
  const fileLog = [];

  for (const book of bible.books || []) {
    for (const chapter of book.chapters || []) {
      const context = `${book.name} ${chapter.number}`;
      const result = processVerses(chapter.verses || [], context, fileLog);

      if (result.fixed) {
        chapter.verses = result.verses;
        bibleWasModified = true;
      }
    }
  }

  // 3. Log & Write
  if (bibleWasModified) {
    fixedCount++;
    const status = FLAGS.DRY_RUN ? "Needs fixing" : "Fixed";
    logMessage(`📖 ${status}: ${file}`);
    
    logGroupedErrors(fileLog);

    if (!FLAGS.DRY_RUN) {
      const outputName = `fixed_${file}`; // distinct prefix
      const outputPath = path.join(OUTPUT_DIR, outputName);
      writeBibleFile(outputPath, bibleWrapper);
    }
    logMessage(""); // Spacer
  }
}

// ===== 🏁 Summary =====

const summary = `
Done.
📘 ${fixedCount} Bible(s) ${FLAGS.DRY_RUN ? "would need fixing" : "needed fixing"}
⚠️ ${invalidCount} file(s) had invalid JSON/FSB and were skipped.
🔎 Reminder: ${
  FLAGS.DRY_RUN
    ? "These changes would affect verse ranges. Please double-check them against the original/reference Bible."
    : "These changes affected verse ranges. Please double-check them against the original/reference Bible."
}
`;

logMessage(summary);
flushLogs();