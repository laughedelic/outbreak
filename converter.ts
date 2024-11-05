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
type TasksConfig = {
  globalFilterTag?: string;
  priorityMapping: Record<string, TaskPriority>;
  convertDates: boolean;
  createDateProperty: boolean;
};

// Default configuration
const DEFAULT_TASKS_CONFIG: TasksConfig = {
  priorityMapping: TaskPriorityMapping,
  convertDates: true,
  createDateProperty: false,
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
  config: TasksConfig = DEFAULT_TASKS_CONFIG,
): ConversionRule => ({
  name: "tasks",
  convert: (content: string) => {
    const taskRegex = /^(\s*)- \[([ x\/\-])\](.*?)$/gm;
    return content.replace(
      taskRegex,
      (_, indent, status, text) => {
        // Parse the task text to extract dates and priority
        const dates: TaskDate[] = [];
        let taskText = text;

        // Extract and remove dates if enabled
        if (config.convertDates) {
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
            config.priorityMapping,
          )
        ) {
          if (taskText.includes(emoji)) {
            priority = ` [#${logseqPriority}]`;
            taskText = taskText.replace(new RegExp(`\\s?${emoji}`), "");
          }
        }

        // Remove global filter tag if configured
        if (config.globalFilterTag) {
          taskText = taskText.replace(
            new RegExp(` ${config.globalFilterTag}\\b`),
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
              if (config.createDateProperty) {
                lines.push(`${indent}  created:: [[${date}]]`);
              }
              break;
              // Other date types are ignored as they don't have Logseq equivalents
          }
        }

        return lines.join("\n");
      },
    );
  },
});

const convertBlocks: ConversionRule = {
  name: "blocks",
  convert: (content: string) => {
    const lines = content.split("\n");
    const converted: string[] = [];
    const blockLines: string[] = [];
    let blockType: string | null = null;

    function closeBlock() {
      // console.debug("<:", blockType, "\n");
      if (blockType) {
        // pass the block content recursively to handle nested blocks
        const recurse = convertBlocks.convert(blockLines.join("\n"));
        converted.push(recurse);
        converted.push(`#+END_${blockType.toUpperCase()}`);
        blockType = null;
        // reset block lines
        blockLines.length = 0;
      }
    }

    for (const line of lines) {
      const blockMatch = line.match(
        /^>\s?(?<callout>\[!(?<type>\w+)\]\s?)?(?<text>.*)$/,
      );

      if (blockMatch) {
        const groups = blockMatch.groups;
        if (!blockType) { // start a new block
          blockType = groups?.callout ? groups.type : "QUOTE";
          // console.debug(">:", blockType);
          converted.push(`#+BEGIN_${blockType.toUpperCase()}`);
          // callouts can have a title
          if (groups?.text && blockType !== "QUOTE") {
            // console.debug("T:", groups.text);
            blockLines.push(groups.text.trimEnd());
          }
        }
        if (
          !groups?.callout && groups?.text !== undefined
        ) {
          // console.debug("I:", groups.text);
          blockLines.push(groups.text.trimEnd());
        }
        continue;
      }

      if (blockType && line.trim() === "") { // blank line ends the block
        closeBlock();
        continue;
      }

      // Regular line
      // console.debug("R:", line);
      converted.push(line);
    }

    // Handle any remaining open blocks
    closeBlock();

    return converted.join("\n");
  },
};

const convertFrontmatter: ConversionRule = {
  name: "frontmatter",
  convert: (content: string) => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);

    if (!match) return content;

    const yamlContent = match[1];
    const parsedYaml = yaml.parse(yamlContent, {
      schema: "failsafe",
    }) as Record<string, string | string[]>;
    const properties: string[] = [];

    for (const [key, value] of Object.entries(parsedYaml)) {
      const valueStr = Array.isArray(value) ? value.join(", ") : value;
      properties.push(`${key}:: ${valueStr}`);
    }

    return content.replace(frontmatterRegex, `${properties.join("\n")}\n`);
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

    // TODO: another case for tweets

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

// Add the new rule to the rules array
export class MarkdownConverter {
  private rules: ConversionRule[];

  constructor(config?: Partial<TasksConfig>) {
    const finalConfig = { ...DEFAULT_TASKS_CONFIG, ...config };

    this.rules = [
      convertFrontmatter, // Process frontmatter first
      convertBlocks,
      convertTasks(finalConfig), // Then lists/tasks
      convertHighlights, // Then inline formatting
      convertWikiLinks, // Then links
      convertNumberedLists, // Then numbered lists
      convertEmbeds, // Finally, process embeds
    ];
  }

  convert(content: string): string {
    return this.rules.reduce((text, rule) => rule.convert(text), content);
  }
}

// CLI handler remains the same
if (import.meta.main) {
  const inputFile = Deno.args[0];
  const outputFile = Deno.args[1];

  if (!inputFile || !outputFile) {
    console.log(
      "Usage: deno run --allow-read --allow-write converter.ts <input-file> <output-file>",
    );
    Deno.exit(1);
  }

  const content = await Deno.readTextFile(inputFile);
  const converter = new MarkdownConverter();
  const converted = converter.convert(content);
  await Deno.writeTextFile(outputFile, converted);
}
