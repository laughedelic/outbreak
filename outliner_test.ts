import { assertEquals } from "jsr:@std/assert";
import { outlineMarkdown } from "./outliner.ts";

Deno.test("outlineMarkdown", async (t) => {
  await t.step("should convert headings and paragraphs correctly", () => {
    const input = `
# h1

paragraph

## h2

next paragraph

- a list
- of items
  - and nested items
  - with more items
    - inside
    - them

another paragraph
`.trim();

    const expectedOutput = `
- # h1
  - paragraph
  - ## h2
    - next paragraph
    - a list
    - of items
      - and nested items
      - with more items
        - inside
        - them
    - another paragraph
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle nested headings correctly", () => {
    const input = `
# h1

paragraph

## h2-1

next paragraph

- a list
- of items

another paragraph

### h3

h3 paragraph

## h2-2

h2-2 paragraph

#### h4

h4 paragraph out of order
`.trim();

    const expectedOutput = `
- # h1
  - paragraph
  - ## h2-1
    - next paragraph
    - a list
    - of items
    - another paragraph
    - ### h3
      - h3 paragraph
  - ## h2-2
    - h2-2 paragraph
    - #### h4
      - h4 paragraph out of order
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });
});

Deno.test("outlineMarkdown with listNesting option", async (t) => {
  const input = `
# h1

- a
- b
  - c
  - d

## h2

paragraph

- a
- b
  - c
  - d

paragraph
`.trim();

  await t.step("no extra nesting", () => {
    const expectedOutput = `
- # h1
  - a
  - b
    - c
    - d
  - ## h2
    - paragraph
    - a
    - b
      - c
      - d
    - paragraph
`.trim();

    assertEquals(
      outlineMarkdown(input, { listNesting: "none" }),
      expectedOutput,
    );
  });

  await t.step("nesting lists in paragraphs", () => {
    const expectedOutput = `
- # h1
  - a
  - b
    - c
    - d
  - ## h2
    - paragraph
      - a
      - b
        - c
        - d
    - paragraph
`.trim();

    assertEquals(
      outlineMarkdown(input, { listNesting: "paragraph" }),
      expectedOutput,
    );
  });

  await t.step("nesting lists in empty blocks", () => {
    const expectedOutput = `
- # h1
  -
    - a
    - b
      - c
      - d
  - ## h2
    - paragraph
    -
      - a
      - b
        - c
        - d
    - paragraph
`.trim();

    assertEquals(
      outlineMarkdown(input, { listNesting: "separate" }),
      expectedOutput,
    );
  });
});
