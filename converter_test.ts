import { assertEquals } from "jsr:@std/assert";
import { MarkdownConverter } from "./converter.ts";

const converter = new MarkdownConverter();

// Task Tests
Deno.test("Tasks", async (t) => {
  await t.step("simple tasks", () => {
    const input = [
      "- [ ] Todo task",
      "- [/] In progress",
      "- [x] Completed",
      "- [-] Cancelled",
    ].join("\n");

    const expected = [
      "- TODO Todo task",
      "- DOING In progress",
      "- DONE Completed",
      "- CANCELLED Cancelled",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("nested tasks", () => {
    const input = [
      "- [ ] Parent task",
      "  - [x] Child task",
      "    - [ ] Grandchild task",
    ].join("\n");

    const expected = [
      "- TODO Parent task",
      "  - DONE Child task",
      "    - TODO Grandchild task",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("task with other content", () => {
    const input = "- [ ] Task with ==highlight== and [[Page|alias]]";
    const expected = "- TODO Task with ^^highlight^^ and [alias]([[Page]])";
    assertEquals(converter.convert(input), expected);
  });
});

// Highlight Tests
Deno.test("Highlights", async (t) => {
  await t.step("simple highlight", () => {
    const input = "Text with ==highlighted== words";
    const expected = "Text with ^^highlighted^^ words";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("multiple highlights", () => {
    const input = "Text with ==multiple== ==highlights== here";
    const expected = "Text with ^^multiple^^ ^^highlights^^ here";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("nested formatting", () => {
    const input = "==highlight with **bold** inside==";
    const expected = "^^highlight with **bold** inside^^";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("multiline highlight", () => {
    const input = "==highlight\nspanning\nlines==";
    const expected = "^^highlight\nspanning\nlines^^";
    assertEquals(converter.convert(input), expected);
  });
});

// Wiki-link Tests
Deno.test("Wiki-links", async (t) => {
  await t.step("simple alias", () => {
    const input = "[[Page Name|Custom Title]]";
    const expected = "[Custom Title]([[Page Name]])";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("multiple aliases in text", () => {
    const input = "See [[Page 1|Title 1]] and [[Page 2|Title 2]]";
    const expected = "See [Title 1]([[Page 1]]) and [Title 2]([[Page 2]])";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("link with special characters", () => {
    const input = "[[Page/With/Path|Custom Title]]";
    const expected = "[Custom Title]([[Page/With/Path]])";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("nested within task", () => {
    const input = "- [ ] Check [[Page|Title]]";
    const expected = "- TODO Check [Title]([[Page]])";
    assertEquals(converter.convert(input), expected);
  });
});

// Embed Tests
Deno.test("Embeds", async (t) => {
  await t.step("simple embed", () => {
    const input = "Check this embed: ![[Page]]";
    const expected = "Check this embed: {{embed [[Page]]}}";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("embed with path", () => {
    const input = "Embed with path: ![[path/to/Page]]";
    const expected = "Embed with path: {{embed [[path/to/Page]]}}";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("multiple embeds", () => {
    const input = "Multiple embeds: ![[Page1]] and ![[Page2]]";
    const expected =
      "Multiple embeds: {{embed [[Page1]]}} and {{embed [[Page2]]}}";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("embed within task", () => {
    const input = "- [ ] Check this embed: ![[Page]]";
    const expected = "- TODO Check this embed: {{embed [[Page]]}}";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("YouTube video embed", () => {
    const input =
      "Watch this video: ![Video](https://www.youtube.com/watch?v=yu27PWzJI_Y)";
    const expected =
      "Watch this video: {{video https://www.youtube.com/watch?v=yu27PWzJI_Y}}";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("Vimeo video embed", () => {
    const input = "Watch this video: ![Video](https://vimeo.com/123456789)";
    const expected = "Watch this video: {{video https://vimeo.com/123456789}}";
    assertEquals(converter.convert(input), expected);
  });
});

// Complex Cases
Deno.test("Complex Cases", async (t) => {
  await t.step("mixed elements", () => {
    const input = "- [ ] Task with ==highlight== and [[Page|alias]]";
    const expected = "- TODO Task with ^^highlight^^ and [alias]([[Page]])";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("nested within quote", () => {
    const input = [
      "> Quote with:",
      "> - [ ] Task",
      "> ==highlight==",
      "> [[Page|alias]]",
    ].join("\n");

    const expected = [
      "#+BEGIN_QUOTE",
      "Quote with:",
      "- TODO Task",
      "^^highlight^^",
      "[alias]([[Page]])",
      "#+END_QUOTE",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("callout with content", () => {
    const input = [
      "> [!note]",
      "> Note with ==highlight==",
      "> - [ ] Task",
      "> [[Page|alias]]",
    ].join("\n");

    const expected = [
      "#+BEGIN_NOTE",
      "Note with ^^highlight^^",
      "- TODO Task",
      "[alias]([[Page]])",
      "#+END_NOTE",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });
});

// Edge Cases
Deno.test("Edge Cases", async (t) => {
  await t.step("unterminated highlight", () => {
    const input = "Text with ==unterminated highlight";
    const expected = "Text with ==unterminated highlight";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("unterminated wiki-link", () => {
    const input = "Text with [[Page|unterminated alias";
    const expected = "Text with [[Page|unterminated alias";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("escaped characters", () => {
    const input = "Text with \\==not a highlight== and \\[[not a link]]";
    const expected = "Text with \\==not a highlight== and \\[[not a link]]";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("no text before tasks", () => {
    const input = "Text before - [ ]";
    const expected = input;
    assertEquals(converter.convert(input), expected);
  });
});

Deno.test("Empty Elements", async (t) => {
  await t.step("empty highlights", () => {
    const input = "====";
    const expected = "^^^^";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("empty wiki links", () => {
    const input = "[[|]]";
    const expected = "[[|]]"; // Should be preserved as-is
    assertEquals(converter.convert(input), expected);
  });

  await t.step("empty tasks", () => {
    const input = "- [ ]";
    const expected = "- TODO";
    assertEquals(converter.convert(input), expected);
  });

  await t.step("mixed empty elements", () => {
    const input = "==== and [[|]]";
    const expected = "^^^^ and [[|]]";
    assertEquals(converter.convert(input), expected);
  });
});

Deno.test("Numbered Lists", async (t) => {
  await t.step("simple numbered list", () => {
    const input = [
      "1. one",
      "2. two",
      "3. three",
    ].join("\n");

    const expected = [
      "- one",
      "  logseq.order-list-type:: number",
      "- two",
      "  logseq.order-list-type:: number",
      "- three",
      "  logseq.order-list-type:: number",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("nested numbered list", () => {
    const input = [
      "- a",
      "  1. a1",
      "  2. a2",
      "- b",
      "  - c",
      "    1. c1",
      "    2. c2",
    ].join("\n");

    const expected = [
      "- a",
      "  - a1",
      "    logseq.order-list-type:: number",
      "  - a2",
      "    logseq.order-list-type:: number",
      "- b",
      "  - c",
      "    - c1",
      "      logseq.order-list-type:: number",
      "    - c2",
      "      logseq.order-list-type:: number",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("numbered list with text", () => {
    const input = [
      "1. one",
      "2. two",
      "3. three",
      "   and a half",
    ].join("\n");

    const expected = [
      "- one",
      "  logseq.order-list-type:: number",
      "- two",
      "  logseq.order-list-type:: number",
      "- three",
      "  logseq.order-list-type:: number",
      "   and a half",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("mixed list types", () => {
    const input = [
      "- bullet",
      "1. numbered",
      "2. numbered",
      "- bullet",
    ].join("\n");

    const expected = [
      "- bullet",
      "- numbered",
      "  logseq.order-list-type:: number",
      "- numbered",
      "  logseq.order-list-type:: number",
      "- bullet",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("numbered list with other content", () => {
    const input = [
      "1. item with ==highlight== and [[Page|alias]]",
      "2. another item",
    ].join("\n");

    const expected = [
      "- item with ^^highlight^^ and [alias]([[Page]])",
      "  logseq.order-list-type:: number",
      "- another item",
      "  logseq.order-list-type:: number",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });

  await t.step("numbered list with empty lines", () => {
    const input = [
      "1. one",
      "",
      "2. two",
      "",
      "3. three",
    ].join("\n");

    const expected = [
      "- one",
      "  logseq.order-list-type:: number",
      "",
      "- two",
      "  logseq.order-list-type:: number",
      "",
      "- three",
      "  logseq.order-list-type:: number",
    ].join("\n");

    assertEquals(converter.convert(input), expected);
  });
});

Deno.test("Frontmatter Conversion", async (t) => {
  await t.step("basic frontmatter", () => {
    const input = `
---
aliases: ["buh", "bar"]
description: This is a text with a [[reference]] and a [link](https://example.com)
tags:
  - foo
  - "words with spaces"
---

This is a sample content.
    `.trim();

    const expected = `
aliases:: buh, bar
description:: This is a text with a [[reference]] and a [link](https://example.com)
tags:: foo, words with spaces

This is a sample content.
    `.trim();

    assertEquals(converter.convert(input), expected);
  });

  await t.step("frontmatter with single values", () => {
    const input = `
---
title: Sample Title

date: 2023-10-01
---

This is a sample content.
    `.trim();

    const expected = `
title:: Sample Title
date:: 2023-10-01

This is a sample content.
    `.trim();

    assertEquals(converter.convert(input), expected);
  });

  await t.step("no frontmatter", () => {
    const input = `
This is a sample content 
without frontmatter.
    `.trim();

    const expected = input;

    assertEquals(converter.convert(input), expected);
  });
});
