# Markdown Converter and Outliner

## Purpose

This project provides tools to convert Markdown documents from Obsidian-flavored Markdown to Logseq's org-mode inspired Markdown. It includes two main scripts: `converter.ts` and `outliner.ts`, along with their respective test files. The project also includes documentation on the structural and syntactical differences between Obsidian and Logseq.

## Design

### Scripts

1. **[converter.ts](converter.ts)**: This script handles the conversion of various Markdown elements such as tasks, highlights, wiki-links, embeds, block quotes, callouts, and frontmatter from Obsidian to Logseq format.
2. **[outliner.ts](outliner.ts)**: This script converts the flat structure of Markdown documents into a nested list structure suitable for Logseq.

### Documentation

1. **[structure-difference.md](structure-difference.md)**: This document explains the structural differences between Obsidian and Logseq and provides guidelines on how to convert documents to maintain the intended structure.
2. **[syntax-differences.md](syntax-differences.md)**: This document details the syntactical differences between Obsidian and Logseq Markdown, including tasks, wiki-links, frontmatter, block quotes, callouts, and embeds.

## Usage Instructions

### `converter.ts`

To convert a Markdown file from Obsidian to Logseq format, run the following command:

```sh
deno run converter.ts <input-file> <output-file>
```

### `outliner.ts`

To convert a Markdown file from a flat structure to a nested list structure suitable for Logseq, run the following command:

```sh
deno run outliner.ts <input-file> <output-file>
```

## Development instructions

1. Setup: Ensure you have Deno installed on your system.
2. Run tests:

```sh
deno test
```

3. Linting and formatting:

```sh
deno lint
deno fmt
```

## Potential Improvements

- Enhanced Error Handling: Improve error handling for edge cases and malformed Markdown.
- Additional Markdown Features: Support more Markdown features and plugins used in Obsidian and Logseq.
  - Deeper Obsidian Tasks plugin support: due date, scheduled, etc.
- Configuration Options: Add configuration options for different conversion rules and output formats.
  - Space vs. tabs indentation
  - Treating H1 as a page title property
- A full migration script that can handle the entire vault, including file renaming and folder restructuring.
  - Unlike in Obsidian, Logseq's file structure is very prescriptive:
    - daily notes: `journals/YYYY-MM-DD.md` (flat structure, date format is partially configurable)
    - assets: `assets/` (flat structure)
    - pages: `pages/` (flat structure), all non-daily notes can be moved there without changing the subfolder structure
  - Nice to have: interactive migration script with progress report and error handling
