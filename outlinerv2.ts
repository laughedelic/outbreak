interface Chunk {
  type: "heading" | "paragraph" | "list";
  content: string;
  level: number;
}

function splitIntoChunks(markdown: string): Chunk[] {
  const lines = markdown.trim().split("\n");
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentType: Chunk["type"] | null = null;

  function commitChunk() {
    if (currentChunk.length > 0 && currentType) {
      const content = currentChunk.join("\n");
      const level = currentType === "heading"
        ? content.match(/^(#+)/)?.[0].length || 0
        : 0;
      chunks.push({ type: currentType, content, level });
      currentChunk = [];
      // console.log("committing chunk", currentType, content);
      currentType = null;
    }
  }

  for (const line of lines) {
    // Skip empty lines between chunks
    if (!line.trim()) {
      commitChunk();
      continue;
    }

    // Detect chunk type
    const isHeading = line.match(/^#+\s/);
    const isList = line.match(/^(-|\d+\.)\s/);
    const isParagraph = line.match(/^\S/) && !isHeading && !isList;

    const newType: Chunk["type"] | null = isHeading
      ? "heading"
      : isList
      ? "list"
      : isParagraph
      ? "paragraph"
      : null;

    // If this is a new chunk type, commit the previous chunk
    if (newType && newType !== currentType && currentType !== "list") {
      commitChunk();
      currentType = newType;
    }

    // Start a new list chunk or continue existing one
    if (isList && !currentType) {
      currentType = "list";
    }

    // Add line to current chunk
    if (currentType) {
      currentChunk.push(line);
    }
  }

  commitChunk();
  return chunks;
}

function outlineChunks(
  chunks: Chunk[],
  options: { listNesting: "none" | "paragraph" | "separate" },
): string {
  const lines: string[] = [];
  const headingStack: number[] = [0];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (chunk.type === "heading") {
      // Adjust heading stack based on heading level
      while (headingStack[headingStack.length - 1] >= chunk.level) {
        headingStack.pop();
      }
      headingStack.push(chunk.level);
    }

    // Calculate indent level (subtract 1 to avoid double-counting the root level)
    const headingLevel = headingStack.length - 1;
    const indentLevel = chunk.type === "heading"
      ? headingLevel - 1
      : headingLevel;
    const indent = "  ".repeat(indentLevel);

    // Handle list nesting options
    let listNestingIndent = "";
    if (chunk.type === "list") {
      const isFollowingParagraph = i > 0 && chunks[i - 1].type === "paragraph";
      if (options.listNesting === "paragraph" && isFollowingParagraph) {
        listNestingIndent = "  ";
      } else if (options.listNesting === "separate") {
        // Add a single empty item before the list
        lines.push(indent + "-");
        listNestingIndent = "  ";
      }
    }

    // Add the chunk with proper indentation
    const chunkLines = chunk.content.split("\n");
    chunkLines.forEach((line, index) => {
      const prefix = index === 0 && chunk.type !== "list"
        ? "- "
        : chunk.type === "paragraph"
        ? "  "
        : "";
      lines.push(indent + prefix + listNestingIndent + line);
    });
  }

  return lines.join("\n");
}

export function outlineMarkdown(
  markdown: string,
  options: { listNesting: "none" | "paragraph" | "separate" } = {
    listNesting: "none",
  },
): string {
  const chunks = splitIntoChunks(markdown);
  return outlineChunks(chunks, options);
}
