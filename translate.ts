import * as yaml from "jsr:@std/yaml/parse";

type ConversionRule = {
  name: string;
  convert: (content: string) => string;
};

type TaskDateType =
  | "deadline"
  | "scheduled"
  | "created"
  | "start"
  | "done"
  | "cancelled";

type TaskDate = {
  type: TaskDateType;
  date: string;
  emoji: string;
};

const TaskStatusMapping: Record<string, string> = {
  " ": "TODO",
  "/": "DOING",
  "x": "DONE",
  "-": "CANCELLED",
};

const TaskDateTypeMapping: Record<string, TaskDateType> = {
  "📅": "deadline",
  "⏳": "scheduled",
  "🛫": "start",
  "➕": "created",
  "✅": "done",
  "❌": "cancelled",
};

type TaskPriority = "A" | "B" | "C";

const TaskPriorityMapping: Record<string, TaskPriority> = {
  "🔺": "A",
  "⏫": "A",
  "🔼": "B",
  "🔽": "C",
  "⏬": "C",
};

// Types at the top of the file
export type TasksConfig = {
  globalFilterTag?: string;
  priorityMapping: Record<string, TaskPriority>;
  convertDates: boolean;
  createDateProperty: boolean;
};

// Default configuration
const defaultTasksConfig: TasksConfig = {
  globalFilterTag: "#task",
  priorityMapping: TaskPriorityMapping,
  convertDates: true,
  createDateProperty: false,
};

export type TranslationConfig = {
  tasks?: Partial<TasksConfig>;
};

const defaultTranslationConfig: TranslationConfig = {
  tasks: defaultTasksConfig,
};

// Helper to format dates with day names
function formatTaskDate(date: string): string {
  const dayName = new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
  });
  return `${date} ${dayName}`;
}

// Edge case helper function
function isEscaped(str: string, pos: number): boolean {
  let count = 0;
  pos--;
  while (pos >= 0 && str[pos] === "\\") {
    count++;
    pos--;
  }
  return count % 2 === 1;
}

const convertHighlights: ConversionRule = {
  name: "highlights",
  convert: (content: string) => {
    // Handle empty highlights first
    content = content.replace(/====/g, "^^^^");
    content = content.replace(/===/g, "^^^");

    // Convert actual highlights, checking for escapes and unterminated highlights
    return content.replace(/==([^=]*==)?/g, (match, text) => {
      if (!text) {
        return match; // Unterminated highlight, preserve as is
      }
      const pos = content.indexOf(match);
      if (isEscaped(content, pos)) {
        return match; // Preserve escaped highlights
      }
      return match.replace(/==/g, "^^"); // Convert to ^^
    });
  },
};

const convertWikiLinks: ConversionRule = {
  name: "wikilinks",
  convert: (content: string) => {
    // Handle empty wiki links (preserve them)
    content = content.replace(/\[\[\|\]\]/g, "[[|]]");

    // Convert normal wiki links with aliases, checking for escapes and unterminated wiki-links
    return content.replace(
      /\[\[([^\]|]+)?(\|([^\]]+))?\]\]/g,
      (match, page, _, alias, offset) => {
        if (!page || !alias) {
          return match; // Unterminated wiki-link, preserve as is
        }
        if (isEscaped(content, offset)) {
          return match; // Preserve escaped wiki links
        }
        return `[${alias}]([[${page}]])`;
      },
    );
  },
};

// Modified task conversion rule
const convertTasks = (
  config?: Partial<TasksConfig>,
): ConversionRule => ({
  name: "tasks",
  convert: (content: string) => {
    const conf = { ...defaultTasksConfig, ...config };

    const taskRegex = /^(\s*)- \[([ x\/\-])\](.*?)$/gm;
    return content.replace(
      taskRegex,
      (_, indent, status, text) => {
        // Parse the task text to extract dates and priority
        const dates: TaskDate[] = [];
        let taskText = text;

        // Extract and remove dates if enabled
        if (conf.convertDates) {
          const dateRegex = /(📅|⏳|🛫|➕|✅|❌)\s*(\d{4}-\d{2}-\d{2})/g;
          let dateMatch;

          while ((dateMatch = dateRegex.exec(text)) !== null) {
            const [_, emoji, date] = dateMatch;
            const type = TaskDateTypeMapping[emoji] as TaskDate["type"];

            dates.push({ type, date, emoji });
          }

          taskText = taskText.replace(dateRegex, "");
        }

        // Extract and remove priority if present
        let priority = "";
        for (
          const [emoji, logseqPriority] of Object.entries(
            conf.priorityMapping,
          )
        ) {
          if (taskText.includes(emoji)) {
            priority = ` [#${logseqPriority}]`;
            taskText = taskText.replace(new RegExp(`\\s?${emoji}`), "");
          }
        }

        // Remove global filter tag if configured
        if (conf.globalFilterTag) {
          taskText = taskText.replace(
            new RegExp(` ${conf.globalFilterTag}\\b`),
            "",
          );
        }

        // Convert task status
        const taskStatus = TaskStatusMapping[status as string];

        // Build the converted task
        const lines: string[] = [];

        // Main task line with status and priority
        lines.push(`${indent}- ${taskStatus}${priority}${taskText.trimEnd()}`);

        // Add dates with proper indentation
        for (const { type, date } of dates) {
          const formattedDate = formatTaskDate(date);
          switch (type) {
            case "deadline":
              lines.push(`${indent}  DEADLINE: <${formattedDate}>`);
              break;
            case "scheduled":
              lines.push(`${indent}  SCHEDULED: <${formattedDate}>`);
              break;
            case "created":
              if (conf.createDateProperty) {
                lines.push(`${indent}  created:: [[${date}]]`);
              }
              break;
              // Other date types are ignored as they don't have Logseq equivalents
              // TODO: add done date as a property?
          }
        }

        return lines.join("\n");
      },
    );
  },
});

// Logseq block types: https://docs.logseq.com/#/page/advanced%20commands
type LogseqBlockType =
  | "NOTE"
  | "TIP"
  | "IMPORTANT"
  | "CAUTION"
  | "WARNING"
  | "EXAMPLE"
  | "QUOTE";

// Mapping of Logseq block types to supported Obsidian callouts
// https://help.obsidian.md/Editing+and+formatting/Callouts#Supported+types
// TODO: expose this as configuration
const blockTypeMapping: Record<LogseqBlockType, string[]> = {
  NOTE: ["note", "info", "summary", "tldr", "abstract"],
  TIP: ["tip", "hint", "help", "question", "faq"],
  IMPORTANT: ["important", "attention"],
  CAUTION: ["caution", "todo"],
  WARNING: ["warning", "error", "danger", "bug", "fail", "failure", "missing"],
  EXAMPLE: ["example"],
  QUOTE: ["quote", "cite"],
};

const blockTypeLookup: Record<string, LogseqBlockType> = Object.fromEntries(
  Object.entries(blockTypeMapping).flatMap(([type, aliases]) =>
    aliases.map((alias) => [alias.toLowerCase(), type as LogseqBlockType])
  ),
);

const convertBlocks: ConversionRule = {
  name: "blocks",
  convert: (content: string) => {
    const lines = content.split("\n");
    const converted: string[] = [];
    const blockLines: string[] = [];
    let blockType: LogseqBlockType | null = null;

    function commitBlock() {
      if (blockType) {
        // pass the block content recursively to handle nested blocks
        const recurse = convertBlocks.convert(blockLines.join("\n"));
        converted.push(recurse);
        converted.push(`#+END_${blockType.toUpperCase()}`);
        // reset the block state
        blockType = null;
        blockLines.length = 0;
      }
    }

    for (const line of lines) {
      const blockMatch = line.match(
        /^>\s?(\[!(?<callout>\w+)\][+-]?\s?)?(?<text>.*)$/,
      );

      if (blockMatch) {
        const groups = blockMatch.groups;
        if (!blockType) { // start a new block
          const calloutType = groups?.callout?.toLowerCase() || "";
          blockType = blockTypeLookup[calloutType] || "quote";
          converted.push(`#+BEGIN_${blockType.toUpperCase()}`);

          // callouts can have a title
          if (groups?.text && blockType !== "QUOTE") {
            blockLines.push(`**${groups.text.trimEnd()}**`);
          }
        }
        if (
          !groups?.callout && groups?.text !== undefined
        ) {
          blockLines.push(groups.text.trimEnd());
        }
        continue;
      }

      if (blockType && line.trim() === "") { // blank line ends the block
        commitBlock();
        continue;
      }

      // Regular line
      converted.push(line);
    }

    // Handle any remaining open blocks
    commitBlock();

    return converted.join("\n");
  },
};

export function extractProperties(
  content: string,
): { properties: string[]; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) return { properties: [], body: content };

  const yamlContent = match[1];
  const parsedYaml = yaml.parse(yamlContent, {
    schema: "failsafe",
  }) as Record<string, string | string[]>;
  const properties: string[] = [];

  for (const [key, value] of Object.entries(parsedYaml)) {
    const valueStr = Array.isArray(value) ? value.join(", ") : value;
    properties.push(`${key}:: ${valueStr}`);
  }

  const body = content.replace(frontmatterRegex, "");
  return { properties, body };
}

const convertFrontmatter: ConversionRule = {
  name: "frontmatter",
  convert: (content: string) => {
    const { properties, body } = extractProperties(content);
    if (!properties.length) return body;

    const propertiesBlock = properties.join("\n");
    return [propertiesBlock, body].join("\n");
  },
};

const convertEmbeds: ConversionRule = {
  name: "embeds",
  convert: (content: string) => {
    // Convert Obsidian embeds to Logseq format
    content = content.replace(/!\[\[(.*?)\]\]/g, (_match, embed) => {
      return `{{embed [[${embed}]]}}`;
    });

    // Convert video embeds from YouTube and Vimeo
    // NOTE: might not handle all possible short URLs
    content = content.replace(
      /!\[(.*?)\]\((https:\/\/(?:www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[^\s)]+)\)/g,
      (_match, _altText, url) => {
        return `{{video ${url}}}`;
      },
    );

    // TODO: another case for tweets/x

    return content;
  },
};

const convertNumberedLists: ConversionRule = {
  name: "numberedLists",
  convert: (content: string) => {
    const lines = content.split("\n");
    const convertedLines: string[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(\s*)\d+\.\s+(.*)/);
      if (match) {
        const indent = match[1];
        const text = match[2];
        convertedLines.push(`${indent}- ${text}`);
        convertedLines.push(`${indent}  logseq.order-list-type:: number`);
      } else {
        convertedLines.push(line);
      }
    });

    return convertedLines.join("\n");
  },
};

export function translate(
  content: string,
  config?: Partial<TranslationConfig>,
): string {
  // deep merge the configuration with defaults
  const conf = { ...defaultTranslationConfig, ...config };

  const rules: ConversionRule[] = [
    convertFrontmatter,
    convertBlocks,
    convertTasks(conf.tasks),
    convertHighlights,
    convertWikiLinks,
    convertNumberedLists,
    convertEmbeds,
  ];

  return rules.reduce((text, rule) => rule.convert(text), content);
}

if (import.meta.main) { // CLI
  const inputFile = Deno.args[0];
  const outputFile = Deno.args[1];

  if (!inputFile || !outputFile) {
    console.log(
      "Usage: deno run --allow-read --allow-write converter.ts <input-file> <output-file>",
    );
    Deno.exit(1);
  }

  const content = await Deno.readTextFile(inputFile);
  const converted = translate(content);
  await Deno.writeTextFile(outputFile, converted);
}
