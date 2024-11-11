import { assertEquals } from "jsr:@std/assert";
import { translate, TranslationConfig } from "./translate.ts";

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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
  });

  await t.step("task with other content", () => {
    const input = "- [ ] Task with ==highlight== and [[Page|alias]]";
    const expected = "- TODO Task with ^^highlight^^ and [alias]([[Page]])";
    assertEquals(translate(input), expected);
  });
});

Deno.test("Task advanced features", async (t) => {
  await t.step("basic task statuses", () => {
    const tests = [
      {
        name: "converts empty checkbox to TODO",
        input: "- [ ] Basic task",
        expected: "- TODO Basic task",
      },
      {
        name: "converts in-progress task to DOING",
        input: "- [/] In progress",
        expected: "- DOING In progress",
      },
      {
        name: "converts completed task to DONE",
        input: "- [x] Completed task",
        expected: "- DONE Completed task",
      },
      {
        name: "converts cancelled task to CANCELLED",
        input: "- [-] Cancelled task",
        expected: "- CANCELLED Cancelled task",
      },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input),
        test.expected,
        test.name,
      );
    }
  });

  await t.step("task priorities", () => {
    const config: TranslationConfig = {
      tasks: {
        priorityMapping: {
          "🔺": "A",
          "⏫": "A",
          "🔼": "B",
          "🔽": "C",
          "⏬": "C",
          "💪": "B", // Custom mapping
        },
      },
    };

    const tests = [
      {
        name: "converts highest priority",
        input: "- [ ] 🔺 Important task",
        expected: "- TODO [#A] Important task",
      },
      {
        name: "converts high priority",
        input: "- [ ] Task ⏫ here",
        expected: "- TODO [#A] Task here",
      },
      {
        name: "converts medium priority",
        input: "- [ ] Task 🔼 medium",
        expected: "- TODO [#B] Task medium",
      },
      {
        name: "converts low priority",
        input: "- [ ] Low 🔽 task",
        expected: "- TODO [#C] Low task",
      },
      {
        name: "converts lowest priority",
        input: "- [ ] Task ⏬ lowest",
        expected: "- TODO [#C] Task lowest",
      },
      {
        name: "converts custom priority emoji",
        input: "- [ ] 💪 Custom priority",
        expected: "- TODO [#B] Custom priority",
      },
      {
        name: "handles priority with status",
        input: "- [x] 🔺 Done high priority",
        expected: "- DONE [#A] Done high priority",
      },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input, config),
        test.expected,
        test.name,
      );
    }
  });

  await t.step("task dates", () => {
    const config: TranslationConfig = {
      tasks: {
        convertDates: true,
      },
    };

    const tests = [
      {
        name: "converts deadline date",
        input: "- [ ] Task 📅 2024-01-01",
        expected: `- TODO Task
  DEADLINE: <2024-01-01 Mon>`,
      },
      {
        name: "converts scheduled date",
        input: "- [ ] Task ⏳ 2024-01-02",
        expected: `- TODO Task
  SCHEDULED: <2024-01-02 Tue>`,
      },
      {
        name: "converts created date to property",
        input: "- [ ] Task ➕ 2024-01-03",
        expected: `- TODO Task
  .created:: [[2024-01-03]]`,
      },
      {
        name: "ignores other dates",
        input: `- [ ] Task 🛫 2024-01-04 ✅ 2024-01-05 ❌ 2024-01-06`,
        expected: `- TODO Task
  .completed:: [[2024-01-05]]
  .cancelled:: [[2024-01-06]]`,
      },
      {
        name: "handles multiple dates",
        input: "- [ ] Task 📅 2024-01-01 ⏳ 2024-01-02 ➕ 2024-01-03",
        expected: `- TODO Task
  DEADLINE: <2024-01-01 Mon>
  SCHEDULED: <2024-01-02 Tue>
  .created:: [[2024-01-03]]`,
      },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input, config),
        test.expected,
        test.name,
      );
    }
  });

  await t.step("indentation", () => {
    const config: TranslationConfig = {
      tasks: {
        convertDates: true,
      },
    };

    const tests = [
      {
        name: "preserves single level indentation",
        input: "  - [ ] Task 📅 2024-01-01",
        expected: `  - TODO Task
    DEADLINE: <2024-01-01 Mon>`,
      },
      {
        name: "preserves multiple level indentation",
        input: "    - [ ] Task 📅 2024-01-01 ⏳ 2024-01-02",
        expected: `    - TODO Task
      DEADLINE: <2024-01-01 Mon>
      SCHEDULED: <2024-01-02 Tue>`,
      },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input, config),
        test.expected,
        test.name,
      );
    }
  });

  await t.step("global filter", () => {
    const config: TranslationConfig = {
      tasks: {
        globalFilterTag: "#task",
      },
    };

    const tests = [
      {
        name: "removes global filter tag",
        input: "- [ ] Task #task",
        expected: "- TODO Task",
      },
      {
        name: "removes global filter tag with surrounding content",
        input: "- [ ] Before #task after",
        expected: "- TODO Before after",
      },
      {
        name: "doesn't remove partial tag matches",
        input: "- [ ] Task #taskforce",
        expected: "- TODO Task #taskforce",
      },
      {
        name: "doesn't remove tag in middle of word",
        input: "- [ ] Task something#task",
        expected: "- TODO Task something#task",
      },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input, config),
        test.expected,
        test.name,
      );
    }
  });

  await t.step("combined features", () => {
    const config: TranslationConfig = {
      tasks: {
        globalFilterTag: "#task",
        priorityMapping: {
          "⏫": "A",
          "🔼": "B",
        },
        convertDates: true,
      },
    };

    const tests = [
      {
        name: "converts task with all features",
        input: "  - [ ] ⏫ Important task #task 📅 2024-01-01 ➕ 2024-01-02",
        expected: `  - TODO [#A] Important task
    DEADLINE: <2024-01-01 Mon>
    .created:: [[2024-01-02]]`,
      },
      {
        name: "converts completed task with all features",
        input: "    - [x] 🔼 Done task #task ⏳ 2024-01-01",
        expected: `    - DONE [#B] Done task
      SCHEDULED: <2024-01-01 Mon>`,
      },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input, config),
        test.expected,
        test.name,
      );
    }
  });

  await t.step("tasks with edge cases", () => {
    const tests = [
      {
        name: "empty task with indentation",
        input: "  - [ ]  ",
        expected: "  - TODO",
      },
      {
        name: "task with invalid status",
        input: "- [?] Invalid status",
        expected: "- [?] Invalid status",
      },
      {
        name: "task with multiple priorities",
        input: "- [ ] 🔺⏫ Double priority",
        expected: "- TODO [#A] Double priority", // Take first priority
      },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input),
        test.expected,
        test.name,
      );
    }
  });
});

// Highlight Tests
Deno.test("Highlights", async (t) => {
  await t.step("simple highlight", () => {
    const input = "Text with ==highlighted== words";
    const expected = "Text with ^^highlighted^^ words";
    assertEquals(translate(input), expected);
  });

  await t.step("multiple highlights", () => {
    const input = "Text with ==multiple== ==highlights== here";
    const expected = "Text with ^^multiple^^ ^^highlights^^ here";
    assertEquals(translate(input), expected);
  });

  await t.step("nested formatting", () => {
    const input = "==highlight with **bold** inside==";
    const expected = "^^highlight with **bold** inside^^";
    assertEquals(translate(input), expected);
  });

  await t.step("multiline highlight", () => {
    const input = "==highlight\nspanning\nlines==";
    const expected = "^^highlight\nspanning\nlines^^";
    assertEquals(translate(input), expected);
  });
});

// Wiki-link Tests
Deno.test("Wiki-links", async (t) => {
  await t.step("simple alias", () => {
    const input = "[[Page Name|Custom Title]]";
    const expected = "[Custom Title]([[Page Name]])";
    assertEquals(translate(input), expected);
  });

  await t.step("multiple aliases in text", () => {
    const input = "See [[Page 1|Title 1]] and [[Page 2|Title 2]]";
    const expected = "See [Title 1]([[Page 1]]) and [Title 2]([[Page 2]])";
    assertEquals(translate(input), expected);
  });

  await t.step("link with special characters", () => {
    const input = "[[Page/With/Path|Custom Title]]";
    const expected = "[Custom Title]([[Page/With/Path]])";
    assertEquals(translate(input), expected);
  });

  await t.step("nested within task", () => {
    const input = "- [ ] Check [[Page|Title]]";
    const expected = "- TODO Check [Title]([[Page]])";
    assertEquals(translate(input), expected);
  });

  await t.step("wiki-link edge cases", () => {
    const tests = [
      {
        name: "link with special characters",
        input: "[[Page with #hash|Title]]",
        expected: "[Title]([[Page with #hash]])",
      },
      // TODO: Fix these edge cases
      // {
      //   name: "link with nested brackets",
      //   input: "[[Page [with] brackets|Title]]",
      //   expected: "[Title]([[Page [with] brackets]])",
      // },
      // {
      //   name: "link with multiple pipes",
      //   input: "[[Page|Alias|Extra]]",
      //   expected: "[Alias]([[Page]])", // Take first alias
      // },
    ];

    for (const test of tests) {
      assertEquals(
        translate(test.input),
        test.expected,
        test.name,
      );
    }
  });
});

// Embed Tests
Deno.test("Embeds", async (t) => {
  await t.step("simple embed", () => {
    const input = "Check this embed: ![[Page]]";
    const expected = "Check this embed: {{embed [[Page]]}}";
    assertEquals(translate(input), expected);
  });

  await t.step("embed with path", () => {
    const input = "Embed with path: ![[path/to/Page]]";
    const expected = "Embed with path: {{embed [[path/to/Page]]}}";
    assertEquals(translate(input), expected);
  });

  await t.step("multiple embeds", () => {
    const input = "Multiple embeds: ![[Page1]] and ![[Page2]]";
    const expected =
      "Multiple embeds: {{embed [[Page1]]}} and {{embed [[Page2]]}}";
    assertEquals(translate(input), expected);
  });

  await t.step("embed within task", () => {
    const input = "- [ ] Check this embed: ![[Page]]";
    const expected = "- TODO Check this embed: {{embed [[Page]]}}";
    assertEquals(translate(input), expected);
  });

  await t.step("YouTube video embed", () => {
    const input =
      "Watch this video: ![Video](https://www.youtube.com/watch?v=yu27PWzJI_Y)";
    const expected =
      "Watch this video: {{video https://www.youtube.com/watch?v=yu27PWzJI_Y}}";
    assertEquals(translate(input), expected);
  });

  await t.step("Vimeo video embed", () => {
    const input = "Watch this video: ![Video](https://vimeo.com/123456789)";
    const expected = "Watch this video: {{video https://vimeo.com/123456789}}";
    assertEquals(translate(input), expected);
  });
});

Deno.test("Quotes and Callouts", async (t) => {
  await t.step("simple quote", () => {
    const input = `
> This is a quote.
> Another line in the quote.
`.trim();

    const expected = `
#+BEGIN_QUOTE
This is a quote.
Another line in the quote.
#+END_QUOTE
`.trim();

    assertEquals(translate(input), expected);
  });

  await t.step("simple callout", () => {
    const input = `
> [!note]
> This is a note.
> Another line in the note.
`.trim();

    const expected = `
#+BEGIN_NOTE
This is a note.
Another line in the note.
#+END_NOTE
`.trim();

    assertEquals(translate(input), expected);
  });

  await t.step("callout with a title", () => {
    const input = `
> [!tip] Tip title
> This is a tip.
> Another line in the tip.
`.trim();

    const expected = `
#+BEGIN_TIP
**Tip title**
This is a tip.
Another line in the tip.
#+END_TIP
`.trim();

    assertEquals(translate(input), expected);
  });
});

// Complex Cases
Deno.test("Complex Cases", async (t) => {
  await t.step("mixed elements", () => {
    const input = "- [ ] Task with ==highlight== and [[Page|alias]]";
    const expected = "- TODO Task with ^^highlight^^ and [alias]([[Page]])";
    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
  });

  await t.step("callout with blank lines", () => {
    const input = [
      "> [!note]",
      ">  ",
      "> Note with ==highlight==",
      ">",
      ">some text is not indented",
    ].join("\n");

    const expected = [
      "#+BEGIN_NOTE",
      "",
      "Note with ^^highlight^^",
      "",
      "some text is not indented",
      "#+END_NOTE",
    ].join("\n");

    assertEquals(translate(input), expected);
  });

  await t.step("nested block elements", () => {
    const input = [
      "> [!note]",
      "> Outer callout",
      "> > [!attention]",
      "> >Inner callout",
      "> > > Regular quote",
      "> >",
      ">>inner callout continues",
    ].join("\n");

    const expected = [
      "#+BEGIN_NOTE",
      "Outer callout",
      "#+BEGIN_IMPORTANT",
      "Inner callout",
      "#+BEGIN_QUOTE",
      "Regular quote",
      "#+END_QUOTE",
      "inner callout continues",
      "#+END_IMPORTANT",
      "#+END_NOTE",
    ].join("\n");

    assertEquals(translate(input), expected);
  });
});

// Edge Cases
Deno.test("Edge Cases", async (t) => {
  await t.step("unterminated highlight", () => {
    const input = "Text with ==unterminated highlight";
    const expected = "Text with ==unterminated highlight";
    assertEquals(translate(input), expected);
  });

  await t.step("unterminated wiki-link", () => {
    const input = "Text with [[Page|unterminated alias";
    const expected = "Text with [[Page|unterminated alias";
    assertEquals(translate(input), expected);
  });

  await t.step("escaped characters", () => {
    const input = "Text with \\==not a highlight== and \\[[not a link]]";
    const expected = "Text with \\==not a highlight== and \\[[not a link]]";
    assertEquals(translate(input), expected);
  });

  await t.step("no text before tasks", () => {
    const input = "Text before - [ ]";
    const expected = input;
    assertEquals(translate(input), expected);
  });
});

Deno.test("Empty Elements", async (t) => {
  await t.step("empty highlights", () => {
    const input = "====";
    const expected = "^^^^";
    assertEquals(translate(input), expected);
  });

  await t.step("empty wiki links", () => {
    const input = "[[|]]";
    const expected = "[[|]]"; // Should be preserved as-is
    assertEquals(translate(input), expected);
  });

  await t.step("empty tasks", () => {
    const input = "- [ ]";
    const expected = "- TODO";
    assertEquals(translate(input), expected);
  });

  await t.step("mixed empty elements", () => {
    const input = "==== and [[|]]";
    const expected = "^^^^ and [[|]]";
    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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

    assertEquals(translate(input), expected);
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
date:: 2023-10-01

This is a sample content.
    `.trim();

    assertEquals(translate(input), expected);
  });

  await t.step("no frontmatter", () => {
    const input = `
This is a sample content 
without frontmatter.
    `.trim();

    const expected = input;

    assertEquals(translate(input), expected);
  });
});
