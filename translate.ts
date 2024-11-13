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
  dateProperties: Partial<Record<TaskDateType, string>>;
};

// Default configuration
const defaultTasksConfig: TasksConfig = {
  globalFilterTag: "#task",
  priorityMapping: TaskPriorityMapping,
  convertDates: true,
  dateProperties: {
    created: ".created",
    done: ".completed",
    cancelled: ".cancelled",
  },
};

export type TranslationConfig = {
  tasks?: Partial<TasksConfig>;
};

const defaultTranslationConfig: TranslationConfig = {
  tasks: defaultTasksConfig,
};

// Helper to format dates with day names
// TODO: use a fixed format?
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

// TODO: remove this rule because Logseq supports markdown syntax
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
        // handle asset links
        if (page.match(/\.(png|jpg|jpeg|gif|pdf|docx|xlsx|pptx)$/)) {
          return `[${alias}](assets/${page})`;
        }
        if (page === alias) {
          return `[[${page}]]`; // Simplify links like [[name|name]] to [[name]]
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
            const type = TaskDateTypeMapping[emoji] as TaskDateType;

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

        // Remove dependency markers (🆔 abcdef, ⛔ abcdef)
        taskText = taskText.replace(/ (🆔|⛔) \w+/, "");

        // Convert task status
        const taskStatus = TaskStatusMapping[status as string];

        // Build the converted task
        const lines: string[] = [];

        // Main task line with status and priority
        lines.push(`${indent}- ${taskStatus}${priority}${taskText.trimEnd()}`);

        // Add dates with proper indentation
        for (const { type, date } of dates) {
          const formattedDate = formatTaskDate(date);
          const property = conf.dateProperties[type];
          switch (type) {
            case "deadline":
              lines.push(`${indent}  DEADLINE: <${formattedDate}>`);
              break;
            case "scheduled":
              lines.push(`${indent}  SCHEDULED: <${formattedDate}>`);
              break;
            default:
              if (property) {
                lines.push(`${indent}  ${property}:: [[${date}]]`);
              }
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
          blockType = blockTypeLookup[calloutType] || "QUOTE";
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

type Frontmatter = Record<string, string | string[]>;

export function parseFrontmatter(
  content: string,
): { frontmatter: Frontmatter; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) return { frontmatter: {}, body: content };

  const yamlContent = match[1];
  const parsedYaml = yaml.parse(yamlContent, {
    schema: "failsafe",
  }) as Frontmatter;

  const body = content.replace(frontmatterRegex, "");
  return { frontmatter: parsedYaml, body };
}

export function renameAndFilterProperties(
  frontmatter: Frontmatter,
): Frontmatter {
  const renamed: Frontmatter = {};

  for (const [key, value] of Object.entries(frontmatter)) {
    // Skip the title property because it can cause name conflicts
    if (key.toLowerCase() === "title") continue;

    // A few special cases for Logseq properties
    const keyStr = key === "tag"
      ? "tags"
      : key === "aliases"
      ? "alias"
      : key.replaceAll(/\s+/g, "-");

    // Linkify the "created" property
    renamed[keyStr] = keyStr === "created" ? `[[${value}]]` : value;
  }

  return renamed;
}

export function formatProperties(properties: Frontmatter): string[] {
  return Object.entries(properties).flatMap(([key, value]) => {
    const valueStr = Array.isArray(value) ? value.join(", ") : value;
    return valueStr ? [`${key}:: ${valueStr}`] : [];
  });
}

export function extractProperties(
  content: string,
): { properties: string[]; body: string } {
  const { frontmatter, body } = parseFrontmatter(content);
  const renamedProperties = renameAndFilterProperties(frontmatter);
  const properties = formatProperties(renamedProperties);
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

const PATTERNS = {
  // Matches Vimeo video URLs, capturing the video ID
  vimeo:
    /(?:https?:\/\/)?(?:(?:www|player)\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|video\/|)(\d+)(?:$|\/|\?|#|\&)/,

  // Matches YouTube URLs (regular videos, shorts, and embeds), capturing the video ID
  youtube:
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/).*$/,

  // Matches Twitter/X status URLs, capturing the tweet ID
  twitter:
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)(?:\/?\w*\/?)*(?:\?.*)?$/,
};

const convertEmbeds: ConversionRule = {
  name: "embeds",
  convert: (content: string) => {
    // Handle common asset formats
    // TODO: better asset handling (requires a file index to see what is migrated as an asset)
    content = content.replace(
      /!\[\[(.*?)\.(png|jpg|jpeg|gif|pdf|docx|xlsx|pptx)(\|(.*?))?\]\]/g,
      (_match, filename, extension, _aliasPart, alias) => {
        const fullName = `${filename}.${extension}`;
        const displayAlias = alias || fullName;
        return `![${displayAlias}](assets/${fullName})`;
      },
    );

    // Convert Obsidian embeds to Logseq format
    content = content.replace(/!\[\[(.*?)\]\]/g, (_match, embed) => {
      return `{{embed [[${embed}]]}}`;
    });

    // Convert embeds from YouTube, Vimeo, and Twitter
    content = content.replace(
      /!\[(.*?)\]\((https:\/\/[^\s)]+)\)/g,
      (_match, _altText, url) => {
        if (PATTERNS.youtube.test(url) || PATTERNS.vimeo.test(url)) {
          return `{{video ${url}}}`;
        } else if (PATTERNS.twitter.test(url)) {
          return `{{tweet ${url}}}`;
        }
        return _match; // Preserve other URLs as is
      },
    );

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
