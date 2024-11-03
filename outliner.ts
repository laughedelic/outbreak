export type OutlineOptions = {
  listNesting: "none" | "paragraph" | "separate";
};

export function outlineMarkdown(
  markdown: string,
  options: OutlineOptions = {
    listNesting: "none",
  },
): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  type MatchType = "heading" | "list" | "paragraph";
  let previousMatch: MatchType | undefined = undefined;

  type IndentStack = { level: number; prefix: string }[];
  const stack: IndentStack = [];

  function getPrefix(): string {
    return stack.length ? "  " + stack[stack.length - 1].prefix : "- ";
  }

  lines.forEach((line) => {
    const headingMatch = line.match(/^(#+)\s+(.*)/);
    const listMatch = line.match(/^(\s*)-\s+(.*)/);
    const isParagraph = !headingMatch && !listMatch && line.trim() !== "";

    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      while (stack.length && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      const prefix = getPrefix();
      result.push(`${prefix}${"#".repeat(level)} ${text}`);
      stack.push({ level, prefix });
      previousMatch = "heading";
    } else if (listMatch) {
      if (options.listNesting === "separate" && previousMatch !== "list") {
        // add an extra empty block to separate list items from the previous paragraph
        result.push(`${getPrefix()}`.trimEnd()); // TODO: check if there should be a space
      }
      if (
        options.listNesting === "paragraph" && previousMatch === "paragraph" ||
        options.listNesting === "separate" && previousMatch !== "list"
      ) {
        // add another level of nesting on the stack
        stack.push({ level: stack.length + 1, prefix: getPrefix() });
      }
      const indent = listMatch[1];
      const text = listMatch[2];
      const prefix = getPrefix();
      result.push(`${indent}${prefix}${text}`);
      previousMatch = "list";
    } else if (isParagraph) {
      if (
        options.listNesting !== "none" && previousMatch === "list"
      ) {
        stack.pop();
      }
      const prefix = getPrefix();
      result.push(`${prefix}${line}`);
      previousMatch = "paragraph";
    }
  });

  return result.join("\n");
}
