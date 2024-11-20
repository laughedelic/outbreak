# Markdown Converter and Outliner for migration from Obsidian to Logseq

[Obsidian](https://obsidian.md) and [Logseq](https://logseq.com) are two popular note-taking applications. While both applications use Markdown, they have different syntax and structure requirements. This project aims to provide tools to convert Markdown documents from Obsidian to Logseq format to facilitate migration between the two applications.

There are surprisingly a lot of differences and nuances, so I made this tool to automate the process and I'm sharing it in case it helps someone else.

## Features

- **Syntax Translation**: Converts various Markdown elements such as tasks, highlights, wiki-links, embeds, block quotes, callouts, and frontmatter from Obsidian to Logseq format.
  - **Tasks**: Converts the syntax from the popular Obsidian Tasks plugin to Logseq org-mode tasks, including dates and priorities.
  - For the full list of syntax differences, see [syntax-differences.md](syntax-differences.md).
- **Structure Outlining**: Converts the flat structure of Markdown documents into a nested list structure suitable for Logseq.
  - The structure implied by the headings in the document is converted into an outline native to Logseq.
  - For the explanation see [structure-difference.md](structure-difference.md).
- **Daily Notes**: Automatically converts Obsidian daily notes to Logseq journal notes.

## Motivation

Logseq advertises that you can simply point it to your folder with Markdown files and it will work, but the reality is that it will not understand some of the Markdown syntax and will treat the base structure of the files as a flat list. Logseq also changes files by treating all content as an outline which messes up the original structure and makes it harder to work with files in other applications.

While you can [make Obsidian play nicely with Logseq](https://discuss.logseq.com/t/making-obsidian-play-nice-with-logseq/1185), it doesn't go the other way around. So this project aims to provide a way to migrate to the format that Logseq expects to take full advantage of its features, then decide whether to keep using Logseq or not.

## Usage

> [!WARNING]
>
> This project is still in development and may not be completely reliable. Use it at your own risk and always make backups of your files.
>
> Also, documentation may be lacking, but don't hesitate to ask for help in the [discussions](https://github.com/laughedelic/outbreak/discussions/new?category=q-a)

Until there are release binaries, you need to have [Deno](https://deno.land) runtime installed on your system, and you need to clone this repository to have the scripts available locally. Once that is done and you are in the cloned repository, you can run it with the following command:

```sh
deno run outbreak.ts <obsidian-vault-path> <output-path>
```

Thanks to the secure Deno runtime, the script will *explicitly ask you for permissions* to read the input files (not modify!) and write the output files. So you know that you are not giving these scipts access to do anything else. It will then plan the migration, *show you the summary*, and ask for confirmation before proceeding. There is also a `--dry-run` flag that you can use to see the plan without actually writing any files.

After you run the migration, you can open the destination folder in Logseq and see the results. If you run it more than once (e.g. after some adjustments), you should re-index the folder in Logseq to make sure it picks up the changes.

> [!IMPORTANT]
>
> Output files will be created or overwritten (!), so don't point it at your existing Logseq graph folder.
> Always try it on a new folder first. If you like the results, you can then copy the files to your main Logseq graph.

> [!TIP]
>
> It is recommended to use [Obsidian Linter](https://github.com/platers/obsidian-linter) plugin to clean up your Obsidian Markdown before committing to the migration. This will help to avoid some potential issues with inconsistent formatting.

> [!NOTE]
>
> There is a lot of potential for configurability and customization in this tool. At the moment it's just tuned to my personal needs, but I want to expose the configuration to make it more flexible and useful for others.
>
> For now, you can modify the in-code configuration directly to adjust the behavior.

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

> [!TIP]
>
> Contributions are welcome! Take a look at the [TODO.md](TODO.md) file and any `TODO` comments in the code.
> Open a new [discussion](https://github.com/laughedelic/outbreak/discussions/new?category=ideas) to plan the implementation or suggest your ideas.
