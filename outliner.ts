// outliner.ts

export function convertToLogseq(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  const stack: { level: number; prefix: string }[] = [];

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
      const prefix = stack.length
        ? "  " + stack[stack.length - 1].prefix
        : "- ";
      result.push(`${prefix}${"#".repeat(level)} ${text}`);
      stack.push({ level, prefix });
    } else if (listMatch) {
      // TODO: should list be nested under the last paragraph?
      // const indent = listMatch[1];
      const text = listMatch[2];
      const prefix = stack.length
        ? "  " + stack[stack.length - 1].prefix
        : "- ";
      result.push(`${prefix}${text}`);
    } else if (isParagraph) {
      const prefix = stack.length
        ? "  " + stack[stack.length - 1].prefix
        : "- ";
      result.push(`${prefix}${line}`);
    }
  });

  return result.join("\n");
}
