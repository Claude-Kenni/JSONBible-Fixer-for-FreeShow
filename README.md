# JSONBible Fixer for FreeShow

A small Node.js utility to detect and fix empty or missing verse ranges in JSON Bibles that follow the [JSON Bible Format](https://github.com/ChurchApps/json-bible).

This tool now supports both standard JSON and FreeShow Bible (.fsb) formats.

> ⚠️ This script makes best-effort assumptions based on verse numbering and empty text.
> Always recheck the results against the original/reference Bible.

---

## Prerequisites

### 1. Node.js

Download and install Node.js:

👉 [https://nodejs.org/en/download](https://nodejs.org/en/download)

Verify installation:
```bash
node -v
```

---

## Installation

1.  Download or clone this repository
    
2.  Place `fixJsonBible.mjs` anywhere you want (for example, your project root)
    

No npm install required — this script uses only built-in Node.js modules.

---

## Directory Structure

The script expects the following structure outside the project root:

```text
your-folder/
├─ JSONBible-Fixer-for-FreeShow/
│  ├─ fixJsonBible.js
│  └─ logs/          (auto-created log files)
├─ Converted/
│  ├─ Bible1.json
│  ├─ Bible2.fsb
│  └─ ...
├─ Fixed/            (auto-created output)
```
* Converted/ → input JSON or FSB Bibles
* Fixed/ → output (only Bibles that actually needed fixing)
* logs/ → detailed logs (if --log is used)

---

## Usage

Basic usage:
```bash
node fixJsonBible.mjs
```

Show the help message:
```bash
node fixJsonBible.mjs [--help or -h]
```

Dry run (analyze only, no files written):
```bash
node fixJsonBible.mjs --dry-run
```

Write logs to a timestamped file in ./logs/:
```bash
node fixJsonBible.mjs --log
```

Combine flags:

```bash
node fixJsonBible.mjs --dry-run --log
```

---

## What This Script Fixes

* ✅ Empty verse text: Identifies verses with no content.
* ✅ Missing verse numbers: Detects gaps in numbering (e.g., 22 → 25).
* ✅ Range Merging: Merges gaps into the previous verse using endNumber.

---

## Important Reminder ⚠️

This program only makes assumptions.

👉 Always double-check the affected verses using the original/reference Bible to ensure the verse ranges (created via endNumber) are correct for your specific translation.

* * *

## Why This Exists

I honestly built this after **many trials** while trying to fix tagalog JSON Bibles for FreeShow.  
I’m not 100% sure _why_ it works in every case — but it **worked for my use case**, and I’m sharing it for anyone who might need it too.

If it helps you: awesome.  
If it doesn’t: at least you know where the verses broke 😄
