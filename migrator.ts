import { walk } from "jsr:@std/fs/walk";
import {
  basename,
  dirname,
  extname,
  globToRegExp,
  join,
  relative,
} from "jsr:@std/path";
import { sprintf } from "jsr:@std/fmt/printf";
import { blue, cyan, dim, green, red, yellow } from "jsr:@std/fmt/colors";
import { Spinner } from "jsr:@std/cli/unstable-spinner";
import moment from "npm:moment";
import { MarkdownConverter } from "./converter.ts";
import { fullConversion } from "./outbreak.ts";

interface ObsidianDailyNotesConfig {
  format?: string;
  folder?: string;
}

interface ObsidianAppConfig {
  attachmentFolderPath?: string;
}

interface MigrationConfig {
  useNamespaces: boolean;
  journalDateFormat: string;
  ignoredPaths: string[];
  dryRun: boolean;
}

interface MigrationPlan {
  source: string;
  newName: string;
  type: "journals" | "assets" | "pages";
  message?: string;
}

// Function to read and parse Obsidian's daily notes configuration
async function readDailyNotesConfig(
  vaultPath: string,
): Promise<ObsidianDailyNotesConfig> {
  try {
    const configPath = join(vaultPath, ".obsidian", "daily-notes.json");
    const content = await Deno.readTextFile(configPath);
    return JSON.parse(content);
  } catch (_error) {
    console.warn(
      yellow("⚠️  Could not read daily notes config, using defaults"),
    );
    return {};
  }
}

// Function to check if a file matches the daily notes format
function isDailyNote(
  filePath: string,
  config: ObsidianDailyNotesConfig,
): boolean {
  const format = config.format || "YYYY-MM-DD";
  const folder = config.folder || ""; // Default to root if not specified

  // Construct full format including the folder
  const fullFormat = folder ? `[${folder}]/${format}` : format;
  // Drop the extension
  const notePath = filePath.slice(0, -extname(filePath).length);
  // Try to parse it with moment.js (strict mode)
  const parsedMoment = moment(notePath, fullFormat, true);
  return parsedMoment.isValid();
}

async function readObsidianAppConfig(
  vaultPath: string,
): Promise<ObsidianAppConfig> {
  try {
    const configPath = join(vaultPath, ".obsidian", "app.json");
    const content = await Deno.readTextFile(configPath);
    return JSON.parse(content);
  } catch (_error) {
    console.warn(
      yellow("⚠️  Could not read Obsidian config, using defaults"),
    );
    return {};
  }
}

// Function to check if a file is an asset
function isAsset(filePath: string, config: ObsidianAppConfig): boolean {
  const attachmentFolder = config.attachmentFolderPath || "attachments";
  return dirname(filePath).startsWith(attachmentFolder);
}

function newPageName(filePath: string, useNamespaces: boolean): string {
  const filename = useNamespaces
    ? filePath.replace(/[/]/g, "___") // Replace slashes with triple underscores (Logseq convention)
    : basename(filePath); // Keep only the filename (note names should be unique in Obsidian)
  return filename;
}

// Function to create migration plan for a single file
function planFileMigration(
  inputPath: string,
  inputDir: string,
  outputDir: string,
  dailyNotesConfig: ObsidianDailyNotesConfig,
  obsidianAppConfig: ObsidianAppConfig,
  config: MigrationConfig,
): MigrationPlan {
  const relativePath = relative(inputDir, inputPath);

  if (isDailyNote(relativePath, dailyNotesConfig)) {
    const inputFilename = basename(relativePath, extname(relativePath));
    const inputFormat = basename(dailyNotesConfig.format || "YYYY-MM-DD");
    const outputFormat = config.journalDateFormat;

    // Reformat the date string according to the configured format
    const parsedDate = moment(inputFilename, inputFormat);
    const reformattedDate = parsedDate.isValid()
      ? parsedDate.format(outputFormat)
      : inputFilename;

    return {
      source: inputPath,
      newName: join(outputDir, "journals", `${reformattedDate}.md`),
      type: "journals",
      message: parsedDate.isValid()
        ? undefined
        : yellow("⚠️  Could not parse as a date"),
    };
  }

  // Handle assets
  if (isAsset(relativePath, obsidianAppConfig)) {
    return {
      source: inputPath,
      newName: join(outputDir, "assets", basename(relativePath)),
      type: "assets",
    };
  }

  // Handle regular pages
  return {
    source: inputPath,
    newName: join(
      outputDir,
      "pages",
      newPageName(relativePath, config.useNamespaces),
    ),
    type: "pages",
  };
}

// Function to print migration plan
function printMigrationPlan(
  plans: MigrationPlan[],
  inputDir: string,
  outputDir: string,
): void {
  const counts = {
    journals: 0,
    assets: 0,
    pages: 0,
    warnings: 0,
  };

  console.log("\n📋 Migration Plan:");

  function sourceColor(t: string) {
    return t === "journals" ? blue : t === "assets" ? cyan : green;
  }

  for (const plan of plans) {
    counts[plan.type]++;
    if (plan.message) counts.warnings++;

    const logEntry = [
      sourceColor(plan.type)(relative(inputDir, plan.source)),
      "\n   ",
      dim(relative(outputDir, plan.newName)),
      plan.message ? plan.message : "",
    ].join(" ");
    console.log(logEntry);
  }

  console.log("\nSummary:");
  console.log(sourceColor("journals")(`📅 ${counts.journals} journals`));
  console.log(sourceColor("assets")(`📎 ${counts.assets} assets`));
  console.log(sourceColor("pages")(`📝 ${counts.pages} pages`));

  if (counts.warnings > 0) {
    console.log("\nWarnings:");
    console.log(
      yellow(
        `⚠️  ${counts.warnings} files could not be parsed as dates (see above)`,
      ),
    );
  }
}

// Function to execute migration plan
async function executeMigrationPlan(
  plans: MigrationPlan[],
  converter: MarkdownConverter,
): Promise<void> {
  const spinner = new Spinner({
    message: "Executing migration plan...",
    color: "cyan",
  });
  spinner.start();

  let processed = 0;
  const total = plans.length;

  for (const plan of plans) {
    spinner.message = sprintf(
      "Processing (%d/%d): %s",
      processed + 1,
      total,
      dim(relative("", plan.source)),
    );

    // Ensure destination directory exists
    await Deno.mkdir(dirname(plan.newName), { recursive: true });

    if (plan.type === "assets") {
      // Simple copy for assets
      await Deno.copyFile(plan.source, plan.newName);
    } else {
      // Process markdown files
      const content = await Deno.readTextFile(plan.source);
      const convertedContent = await fullConversion(content, converter);
      await Deno.writeTextFile(plan.newName, convertedContent);
    }

    processed++;
  }

  spinner.stop();
}

const defaultConfig: MigrationConfig = {
  useNamespaces: false,
  journalDateFormat: "YYYY-MM-DD",
  ignoredPaths: [
    // "archive/**",
    ".*/**", // any hidden directories in the root
    "**/.*", // hidden files (anywhere)
  ],
  dryRun: false,
};

export async function migrateVault(
  inputDir: string,
  outputDir: string,
  options: Partial<MigrationConfig> = {},
) {
  const config: MigrationConfig = {
    ...defaultConfig,
    ...options,
  };

  const converter = new MarkdownConverter({
    globalFilterTag: "#task",
  });

  // Initialize spinner for file discovery
  const scanSpinner = new Spinner({
    message: `📦 Finding files in ${dim(inputDir)}...`,
    color: "cyan",
  });
  scanSpinner.start();

  // Read Obsidian configuration
  const dailyNotesConfig = await readDailyNotesConfig(inputDir);
  const obsidianAppConfig = await readObsidianAppConfig(inputDir);

  // Find all files
  const files: string[] = [];
  const ignored: Record<string, number> = {};
  for await (const entry of walk(inputDir, { includeDirs: false })) {
    // Skip ignored paths
    const ignorePattern = config.ignoredPaths.find((pattern) =>
      globToRegExp(pattern).test(relative(inputDir, entry.path))
    );
    if (ignorePattern) {
      const key = ignorePattern.includes("**")
        ? dirname(relative(inputDir, entry.path)).split("/")[0]
        : ignorePattern;
      ignored[key] = (ignored[key] || 0) + 1;
      continue;
    }
    files.push(entry.path);
  }

  scanSpinner.stop();

  if (files.length === 0) {
    console.log(yellow("\n⚠️  No files found in the specified directory.\n"));
    return;
  }

  console.log(`\n🔄 Found ${green(files.length.toString())} files to process`);

  // Create migration plans for all files
  const plans = files.map((file) =>
    planFileMigration(
      file,
      inputDir,
      outputDir,
      dailyNotesConfig,
      obsidianAppConfig,
      config,
    )
  );

  // Print migration plan
  printMigrationPlan(plans, inputDir, outputDir);

  const ignoredTotal = Object.values(ignored).reduce((a, b) => a + b, 0);
  console.log(dim(`\nIgnored: ${ignoredTotal} files`));
  for (const [path, count] of Object.entries(ignored)) {
    console.log(dim(`- ${path} (${count} files)`));
  }

  if (config.dryRun) {
    console.log(yellow("\n🔍 Dry run completed. No files were modified.\n"));
    return;
  }

  // Ask for confirmation
  const confirmed = await confirm(
    "\nDo you want to proceed with the migration?",
  );
  if (!confirmed) {
    console.log(red("\n❌ Operation cancelled by user\n"));
    return;
  }

  // Execute migration
  await executeMigrationPlan(plans, converter);

  console.log(green("\n✅ Migration completed successfully!\n"));
}

// CLI handler
if (import.meta.main) {
  const inputDir = Deno.args[0];
  const outputDir = Deno.args[1];

  const flags = new Set(Deno.args.slice(2));

  if (!inputDir || !outputDir) {
    console.log(
      "Usage: deno run --unstable --allow-read --allow-write migration-cli.ts <input-dir> <output-dir> [options]",
    );
    console.log("\nOptions:");
    console.log(
      "  --use-namespaces    Convert folder structure to Logseq namespaces",
    );
    console.log(
      "  --dry-run           Show what would be migrated without making changes",
    );
    console.log(
      "  --date-format=XXX   Specify output date format for journal files",
    );
    Deno.exit(1);
  }

  // Parse options
  const options: Partial<MigrationConfig> = {
    useNamespaces: flags.has("--use-namespaces"),
    dryRun: flags.has("--dry-run"),
  };

  // Parse date format if provided
  const dateFormatArg = [...flags].find((arg) =>
    arg.startsWith("--date-format=")
  );
  if (dateFormatArg) {
    options.journalDateFormat = dateFormatArg.split("=")[1];
  }

  await migrateVault(inputDir, outputDir, options)
    .catch((error) => {
      console.error("\n❌ Error during migration:", error);
      Deno.exit(1);
    });
}
