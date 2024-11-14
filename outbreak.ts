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
import {
  formatProperties,
  parseFrontmatter,
  renameAndFilterProperties,
  translate,
} from "./translate.ts";
import { outlineChunks, splitIntoChunks } from "./outline.ts";

interface ObsidianDailyNotesConfig {
  format?: string;
  folder?: string;
}

interface ObsidianAppConfig {
  attachmentFolderPath?: string;
}

interface MigrationConfig {
  useNamespaces: boolean;
  extraDailyNotesFormats: string[];
  journalDateFormat: string;
  ignoredPaths: string[];
  dryRun: boolean;
}

interface MigrationPlan {
  source: string;
  newName: string;
  renamed?: { oldName: string; newName: string };
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
  dailyNotesConfig: ObsidianDailyNotesConfig,
  migrationConfig: MigrationConfig,
): boolean {
  const format = dailyNotesConfig.format || "YYYY-MM-DD";
  const folder = dailyNotesConfig.folder || ""; // Default to root if not specified

  // Construct full format including the folder
  const fullFormat = folder ? `[${folder}]/${format}` : format;
  // Drop the extension
  const notePath = filePath.slice(0, -extname(filePath).length);
  // Try to parse it with moment.js (strict mode)
  const parsedMoment = moment(notePath, [
    fullFormat,
    ...migrationConfig.extraDailyNotesFormats,
  ], true);
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
  // const attachmentFolder = config.attachmentFolderPath || "attachments";
  // return dirname(filePath).startsWith(attachmentFolder);
  return extname(filePath) !== ".md";
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

  if (isDailyNote(relativePath, dailyNotesConfig, config)) {
    const inputFilename = basename(relativePath, extname(relativePath));
    const inputFormat = basename(dailyNotesConfig.format || "YYYY-MM-DD");
    const outputFormat = config.journalDateFormat;

    // Reformat the date string according to the configured format
    const parsedDate = moment(inputFilename, [
      inputFormat,
      ...config.extraDailyNotesFormats.map((f) => basename(f)),
    ]);
    const reformattedDate = parsedDate.isValid()
      ? parsedDate.format(outputFormat)
      : inputFilename;
    const renamed = reformattedDate === inputFilename ? undefined : {
      oldName: inputFilename,
      newName: reformattedDate,
    };

    return {
      source: inputPath,
      newName: join(outputDir, "journals", `${reformattedDate}.md`),
      type: "journals",
      renamed: renamed,
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

export function markdownToLogseq(
  content: string,
  plan?: MigrationPlan,
  config?: MigrationConfig,
) {
  // First process frontmatter
  const { frontmatter, body } = parseFrontmatter(content);
  const filteredFrontmatter = renameAndFilterProperties(frontmatter);
  if (plan?.type === "journals") {
    // remove "created" from frontmatter
    delete filteredFrontmatter["created"];
    // if the journals date format is not the same, add the old file name as an alias
    if (plan.renamed) {
      const aliases = new Set([
        plan.renamed.oldName,
        ...(filteredFrontmatter["alias"] || []),
      ]);
      aliases.delete(plan.renamed.newName);
      filteredFrontmatter["alias"] = Array.from(aliases);
    }
  }

  const properties = formatProperties(filteredFrontmatter);

  const propertiesBlock = properties.length
    ? properties.join("\n") + "\n\n"
    : "";

  // Then split the body into chunks and apply conversion
  const chunks = splitIntoChunks(body).map((chunk) => {
    const translated = translate(chunk.content);
    return { ...chunk, content: translated };
  });

  // Now outline translated chunks
  const outline = outlineChunks(chunks, { listNesting: "paragraph" });

  // Reconstruct the final content
  const outlinedContent = propertiesBlock + outline;
  return outlinedContent;
}

// Function to execute migration plan
async function executeMigrationPlan(
  plans: MigrationPlan[],
  config: MigrationConfig,
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
      const convertedContent = await markdownToLogseq(
        content,
        plan,
        config,
      );
      await Deno.writeTextFile(plan.newName, convertedContent);
    }

    processed++;
  }

  spinner.stop();
}

const defaultConfig: MigrationConfig = {
  useNamespaces: false,
  extraDailyNotesFormats: [
    "[journal]/YYYY/YYYY-MM-DD",
    "[journal]/YYYY/MM/YYYY-MM-DD",
  ],
  journalDateFormat: "YYYY-MM-DD",
  ignoredPaths: [
    // "archive/**",
    "**/*.txt",
    "**/*.json",
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
  const prepSpinner = new Spinner({
    message: "🦠 Outbreak: Migrating Obsidian vault to Logseq...",
    color: "cyan",
  });
  prepSpinner.start();

  const config: MigrationConfig = {
    ...defaultConfig,
    ...options,
  };

  prepSpinner.stop();

  // Request permissions to read from input directory
  await Deno.permissions.request({ name: "read", path: inputDir });

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
  const discoveredFiles = walk(inputDir, {
    includeDirs: false,
    // These are hard-ignored patterns:
    skip: [
      /\.DS_Store/,
      /\.git/,
      /\.obsidian/,
      /\.trash/,
      /\.vscode/,
    ],
  });
  const files: string[] = [];
  // Track soft-ignored paths
  const ignored: Record<string, number> = {};
  for await (const entry of discoveredFiles) {
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
  await Deno.permissions.request({ name: "write", path: outputDir });
  await executeMigrationPlan(plans, config);

  console.log(green("\n✅ Migration completed successfully!\n"));
}

// CLI handler
if (import.meta.main) {
  const inputDir = Deno.args[0];
  const outputDir = Deno.args[1];

  const flags = new Set(Deno.args.slice(2));

  if (!inputDir || !outputDir) {
    console.log(
      "Usage: deno run outbreak.ts <input-dir> <output-dir> [options]",
    );
    console.log("\nOptions:");
    console.log(
      "  --use-namespaces    Convert folder structure to Logseq namespaces",
    );
    console.log(
      "  --dry-run           Show what would be migrated without making changes",
    );
    Deno.exit(1);
  }

  // Parse options
  const options: Partial<MigrationConfig> = {
    useNamespaces: flags.has("--use-namespaces"),
    dryRun: flags.has("--dry-run"),
  };

  await migrateVault(inputDir, outputDir, options)
    .catch((error) => {
      console.error("\n❌ Error during migration:", error);
      Deno.exit(1);
    });
}
