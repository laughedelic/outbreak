import * as yaml from "jsr:@std/yaml/parse";

type ConversionRule = {
  name: string;
  convert: (content: string) => string;
};

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

const convertTasks: ConversionRule = {
  name: "tasks",
  convert: (content: string) => {
    // Handle empty task markers
    content = content.replace(/^(\s*)- \[\s*\]/gm, "$1- TODO");

    return content
      .replace(/^(\s*)- \[ \]/gm, "$1- TODO")
      .replace(/^(\s*)- \[\/\]/gm, "$1- DOING")
      .replace(/^(\s*)- \[x\]/gm, "$1- DONE")
      .replace(/^(\s*)- \[-\]/gm, "$1- CANCELLED");
  },
};

const convertBlockQuotes: ConversionRule = {
  name: "blockquotes",
  convert: (content: string) => {
    const lines = content.split("\n");
    const converted: string[] = [];
    let inQuote = false;
    let quoteContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isQuoteLine = line.startsWith("> ");

      // Check if this is a callout
      if (isQuoteLine && line.match(/^>\s*\[!.+?\]$/)) {
        continue; // Skip callout lines - they'll be handled by convertCallouts
      }

      if (isQuoteLine && !inQuote) {
        // Start new quote
        inQuote = true;
        quoteContent = [line.slice(2)];
      } else if (isQuoteLine && inQuote) {
        // Continue quote
        quoteContent.push(line.slice(2));
      } else if (!isQuoteLine && inQuote) {
        // End quote
        converted.push("#+BEGIN_QUOTE");
        converted.push(...quoteContent);
        converted.push("#+END_QUOTE");
        converted.push(line);
        inQuote = false;
        quoteContent = [];
      } else {
        // Regular line
        converted.push(line);
      }
    }

    // Handle case where file ends with a quote
    if (inQuote) {
      converted.push("#+BEGIN_QUOTE");
      converted.push(...quoteContent);
      converted.push("#+END_QUOTE");
    }

    return converted.join("\n");
  },
};

const convertCallouts: ConversionRule = {
  name: "callouts",
  convert: (content: string) => {
    const lines = content.split("\n");
    const converted: string[] = [];
    let inCallout = false;
    let calloutType = "";
    let calloutContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const calloutMatch = line.match(/^>\s*\[!(\w+)\]\s*$/);
      const isCalloutContent = line.startsWith("> ");

      if (calloutMatch) {
        // Start new callout
        if (inCallout) {
          // Close previous callout
          converted.push(`#+BEGIN_${calloutType.toUpperCase()}`);
          converted.push(...calloutContent);
          converted.push(`#+END_${calloutType.toUpperCase()}`);
        }
        inCallout = true;
        calloutType = calloutMatch[1];
        calloutContent = [];
      } else if (isCalloutContent && inCallout) {
        // Continue callout
        calloutContent.push(line.slice(2));
      } else if (!isCalloutContent && inCallout) {
        // End callout
        converted.push(`#+BEGIN_${calloutType.toUpperCase()}`);
        converted.push(...calloutContent);
        converted.push(`#+END_${calloutType.toUpperCase()}`);
        converted.push(line);
        inCallout = false;
        calloutType = "";
        calloutContent = [];
      } else {
        // Regular line
        converted.push(line);
      }
    }

    // Handle case where file ends with a callout
    if (inCallout) {
      converted.push(`#+BEGIN_${calloutType.toUpperCase()}`);
      converted.push(...calloutContent);
      converted.push(`#+END_${calloutType.toUpperCase()}`);
    }

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
    const parsedYaml = yaml.parse(yamlContent, { schema: "failsafe" }) as {
      [key: string]: any;
    };
    const properties: string[] = [];

    for (const [key, value] of Object.entries(parsedYaml)) {
      const prefix = properties.length ? "  " : "- "; // TODO: spaces or tabs?
      const valueStr = Array.isArray(value) ? value.join(", ") : value;
      properties.push(`${prefix}${key}:: ${valueStr}`);
    }

    return content.replace(frontmatterRegex, `${properties.join("\n")}\n`);
  },
};

// Add the new rule to the rules array
export class MarkdownConverter {
  private rules: ConversionRule[];

  constructor() {
    this.rules = [
      convertFrontmatter, // Process frontmatter first
      convertCallouts, // Process callouts next
      convertBlockQuotes, // Then regular blockquotes
      convertTasks, // Then lists/tasks
      convertHighlights, // Then inline formatting
      convertWikiLinks, // Then links
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
