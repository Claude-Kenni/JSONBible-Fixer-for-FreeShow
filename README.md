# JSONBible-Fixer-for-FreeShow
A small Node.js utility to **detect and fix empty or missing verse ranges** in JSON Bibles that follow the [JSON Bible Format](https://github.com/ChurchApps/json-bible).

This tool was created to help users of **[FreeShow](https://github.com/ChurchApps/FreeShow)** who encounter issues with Bible verses that are split across multiple verse numbers (e.g. `Genesis 1:17–18 ASD`, `Genesis 5:22–24 ASD`) but appear as empty or missing verses in JSON files.

> ⚠️ This script makes **best-effort assumptions** based on verse numbering and empty text.  
> Always recheck the results against the **original/reference Bible**.

---

## Prerequisites

### 1. Node.js
Download and install Node.js (LTS recommended):  
👉 https://nodejs.org/en/download

Verify installation:
```bash
node -v
```

* * *

### 2\. JSON Bible files

If you **already have JSON Bible files** (in the JSON Bible Format), you’re good to go:

-   https://github.com/ChurchApps/json-bible
    

If you **do NOT have JSON Bibles yet**, you will need to convert .xml bibles first using:

-   **bible-converter**  
    https://github.com/vassbo/bible-converter
    

> This script does **not** convert Bibles — it only fixes existing JSON Bibles.

* * *

## Installation

1.  Download or clone this repository
    
2.  Place `fixJsonBible.mjs` anywhere you want (for example, your project root)
    

No npm install required — this script uses only built-in Node.js modules.

* * *

## Directory Structure

The script expects the following structure **outside** the project root:

```text
your-folder/
├─ JSONBible-Fixer-for-FreeShow/
│  └─ fixJsonBible.mjs
├─ Converted/
│  ├─ Bible1.json
│  ├─ Bible2.json
│  └─ ...
├─ Fixed/            (auto-created)
```

-   **Converted/** → input JSON Bibles
    
-   **Fixed/** → output (only Bibles that needed fixing)
    

* * *

## Usage

Basic usage:

```bash
node fixJsonBible.mjs
```

Dry run (no files written):

```bash
node fixJsonBible.mjs --dry-run
```

Pretty-printed JSON output:

```bash
node fixJsonBible.mjs --pretty
```

Write logs to a timestamped `.txt` file:

```bash
node fixJsonBible.mjs --log
```

Combine flags:

```bash
node fixJsonBible.mjs --dry-run --pretty --log
```

* * *

## Available Flags

Flag

Description

`--dry-run`

Analyze files without writing output

`--pretty`

Write formatted (pretty-printed) JSON

`--log`

Write logs to a timestamped `.txt` file

`--help`, `-h`

Show help message

If an **unknown flag** is used, the script will show the help screen automatically.

* * *

## What This Script Fixes

-   ✅ Empty verse text (e.g. verse exists but has no text)
    
-   ✅ Missing verse numbers (e.g. verse 22 → 25, missing 23–24)
    
-   ✅ Merges consecutive empty/missing verses using `endNumber`
    
-   ✅ Groups logs by **book + chapter + verse range**
    
-   ✅ Skips invalid JSON files safely (with line/column info)
    

* * *

## What This Script Does NOT Do

-   ❌ It does **not** verify theological or translation accuracy
    
-   ❌ It does **not** compare text against an external Bible source
    
-   ❌ It does **not** guarantee correctness — only consistency
    

> This tool assumes that **empty or missing verses belong to the previous verse**, which is common in some translations — but not always correct.

* * *

## Important Reminder ⚠️

This program **only makes assumptions** based on:

-   empty verse text
    
-   missing verse numbers
    
-   consecutive verse ranges
    

👉 **Always double-check the affected verses using the original/reference Bible** to ensure the verse ranges are correct.

* * *

## Why This Exists

I honestly built this after **many trials** while trying to fix JSON Bibles for FreeShow.  
I’m not 100% sure _why_ it works in every case — but it **worked for my use case**, and I’m sharing it for anyone who might need it too.

If it helps you: awesome.  
If it doesn’t: at least you know where the verses broke 😄
