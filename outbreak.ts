import { walk } from "jsr:@std/fs/walk";
import { dirname, join, relative } from "jsr:@std/path";

import { sprintf } from "jsr:@std/fmt/printf";
import { dim, green, red, yellow } from "jsr:@std/fmt/colors";
import { Spinner } from "jsr:@std/cli/unstable-spinner";

import { MarkdownConverter } from "./converter.ts";
import { outlineMarkdown } from "./outliner.ts";

async function findMarkdownFiles(inputDir: string): Promise<string[]> {
  const markdownFiles: string[] = [];

  for await (
    const entry of walk(inputDir, {
      exts: [".md", ".markdown"],
      includeDirs: false,
    })
  ) {
    markdownFiles.push(entry.path);
  }

  return markdownFiles;
}

async function processFile(
  inputPath: string,
  outputPath: string | null,
  converter: MarkdownConverter,
): Promise<void> {
  // Read the input file
  const content = await Deno.readTextFile(inputPath);

  // First convert the markup
  const convertedContent = converter.convert(content);

  // Then transform the structure
  const outlinedContent = outlineMarkdown(convertedContent, {
    listNesting: "paragraph",
  });

  if (outputPath) {
    // Ensure the output directory exists
    const outputDir = dirname(outputPath);
    await Deno.mkdir(outputDir, { recursive: true });
    await Deno.writeTextFile(outputPath, outlinedContent);
  } else {
    // In-place processing
    await Deno.writeTextFile(inputPath, outlinedContent);
  }
}

async function confirmInPlaceProcessing(fileCount: number): Promise<boolean> {
  console.log(
    yellow("\n⚠️  Warning: You are about to modify files in-place!\n"),
  );
  console.log(
    `This will convert ${fileCount} files in your Obsidian vault directly.`,
  );
  console.log("Make sure you have a backup before proceeding.");
  return confirm("Do you want to continue?");
}

export async function migrateVault(
  inputDir: string,
  outputDir: string | null = null,
) {
  const converter = new MarkdownConverter();

  // Initialize spinner for file discovery
  const scanSpinner = new Spinner({
    message: `📦 Finding Markdown files in ${dim(inputDir)}...`,
    color: "cyan",
  });
  scanSpinner.start();

  const markdownFiles = await findMarkdownFiles(inputDir);
  const totalFiles = markdownFiles.length;

  scanSpinner.stop();

  if (totalFiles === 0) {
    console.log(
      yellow("\n⚠️  No Markdown files found in the specified directory.\n"),
    );
    return;
  }

  console.log(
    `\n🔄 Found ${green(totalFiles.toString())} Markdown files to process`,
  );

  // For in-place processing, ask for confirmation
  if (!outputDir) {
    const confirmed = await confirmInPlaceProcessing(totalFiles);
    if (!confirmed) {
      console.log(red("\n❌ Operation cancelled by user\n"));
      return;
    }
  }

  // Initialize spinner for migration progress
  const migrationSpinner = new Spinner({
    message: "Starting migration...",
    color: "yellow",
  });
  migrationSpinner.start();

  let processed = 0;

  for (const inputPath of markdownFiles) {
    const relativePath = relative(inputDir, inputPath);
    const outputPath = outputDir ? join(outputDir, relativePath) : null;

    migrationSpinner.message = sprintf(
      "Processing (%d/%d): %s",
      processed + 1,
      totalFiles,
      dim(relativePath),
    );

    await processFile(inputPath, outputPath, converter);
    processed++;
  }

  migrationSpinner.stop();

  const modeMsg = outputDir ? `to ${dim(outputDir)}` : "in-place";
  console.log(
    `\n✅ Successfully migrated ${
      green(processed.toString())
    } files ${modeMsg}\n`,
  );
}

// CLI handler
if (import.meta.main) {
  const inputDir = Deno.args[0];
  const outputDir = Deno.args[1] || null;

  if (!inputDir) {
    console.log(
      "Usage: deno run --unstable --allow-read --allow-write migration-cli.ts <input-dir> [output-dir]",
    );
    console.log(
      "\nIf output-dir is not provided, files will be processed and overwritten in-place",
    );
    Deno.exit(1);
  }

  await migrateVault(inputDir, outputDir)
    .catch((error) => {
      console.error("\n❌ Error during migration:", error);
      Deno.exit(1);
    });
}
