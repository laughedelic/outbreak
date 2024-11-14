import { assertEquals } from "jsr:@std/assert";
import { outlineMarkdown } from "./outline.ts";

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

  await t.step("should handle tags and checkboxes correctly", () => {
    const input = `
## h2-1

#some-tag #another-tag

### h3
#### h4-1

a paragraph
- and a list
- [ ] with a checkbox

#### h4-2
paragraph with no separating line
#### h4-3
and more of this mess
- with a list
- as well

## h2-2 another big heading
### h3-2 with a subheading
`.trim();

    const expectedOutput = `
- ## h2-1
  - #some-tag #another-tag
  - ### h3
    - #### h4-1
      - a paragraph
      - and a list
      - [ ] with a checkbox
    - #### h4-2
      - paragraph with no separating line
    - #### h4-3
      - and more of this mess
      - with a list
      - as well
- ## h2-2 another big heading
  - ### h3-2 with a subheading
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });
  await t.step("should handle multiline lists", () => {
    const input = `
paragraph

- a list
  of items

  - and nested items
  - with more items
    - inside
      them

another paragraph
`.trim();

    const expectedOutput = `
- paragraph
- a list
  of items
  - and nested items
  - with more items
    - inside
      them
- another paragraph
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("newlines shouldn't break lists", () => {
    const input = `
- this is a list
  - with a sub list

    > with a quote
    > that continues here
    
  > but then there is a quote 
  > at the first level
  > and it's another quote

- then the list goes on

  - sub item after a newline
- and the last one
`.trim();

    const expectedOutput = `
- this is a list
  - with a sub list
    > with a quote
    > that continues here
  > but then there is a quote 
  > at the first level
  > and it's another quote
- then the list goes on
  - sub item after a newline
- and the last one
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

Deno.test("outlineMarkdown handling block quotes", async (t) => {
  const input = `
# h1

#+BEGIN_QUOTE
quote
  text
   with any indentation
#+END_QUOTE

## h2

#+BEGIN_QUOTE
quote
  text
   with any indentation
#+END_QUOTE
`.trim();

  await t.step("correct quote indentation", () => {
    const expectedOutput = `
- # h1
  - #+BEGIN_QUOTE
    quote
      text
       with any indentation
    #+END_QUOTE
  - ## h2
    - #+BEGIN_QUOTE
      quote
        text
         with any indentation
      #+END_QUOTE
`.trim();

    assertEquals(
      outlineMarkdown(input, { listNesting: "none" }),
      expectedOutput,
    );
  });
});
