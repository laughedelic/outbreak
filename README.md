# Markdown Converter and Outliner

## Purpose

This project provides tools to convert Markdown documents from Obsidian-flavored Markdown to Logseq's org-mode inspired Markdown. It includes two main scripts: `translate.ts` and `outliner.ts`, along with their respective test files. The project also includes documentation on the structural and syntactical differences between Obsidian and Logseq.

## Design

### Scripts

1. **[translate.ts](translate.ts)**: This script handles the conversion of various Markdown elements such as tasks, highlights, wiki-links, embeds, block quotes, callouts, and frontmatter from Obsidian to Logseq format.
2. **[outliner.ts](outliner.ts)**: This script converts the flat structure of Markdown documents into a nested list structure suitable for Logseq.

### Documentation

1. **[structure-difference.md](structure-difference.md)**: This document explains the structural differences between Obsidian and Logseq and provides guidelines on how to convert documents to maintain the intended structure.
2. **[syntax-differences.md](syntax-differences.md)**: This document details the syntactical differences between Obsidian and Logseq Markdown, including tasks, wiki-links, frontmatter, block quotes, callouts, and embeds.

## Usage Instructions

### `translate.ts`

To convert a Markdown file from Obsidian to Logseq format, run the following command:

```sh
deno run translate.ts <input-file> <output-file>
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

## License

> [!TODO] add an open-source license, probably LGPL or MPL