import { assertEquals } from "jsr:@std/assert";
import { outlineMarkdown } from "./outline.ts";
import { splitIntoChunks } from "./outline.ts";

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
});

Deno.test("outlineMarkdown handling mixed lists and headings", async (t) => {
  await t.step("should handle lists before and after headings", () => {
    const input = `
- one
- two

# h1

- three
`.trim();

    const expectedOutput = `
- one
- two
- # h1
  - three
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("heading should split the list without blank lines", () => {
    const input = `
- one
- two
# h1
- three
`.trim();

    const expectedOutput = `
- one
- two
- # h1
  - three
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("hrule should end the list", () => {
    const input = `
- one
- two

---

# h1
- three
`.trim();

    const expectedOutput = `
- one
- two
- ---
- # h1
  - three
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
  await t.step("correct quote indentation", () => {
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

  await t.step("outlineMarkdown handling block quotes with lists", () => {
    const input = `
# h1

#+BEGIN_QUOTE
quote
  text
    with any indentation
- list item inside quote
  - nested item
#+END_QUOTE

## h2

#+BEGIN_TIP
**tip**
- list item inside block
#+END_TIP
### h3
  `.trim();

    const expectedOutput = `
- # h1
  - #+BEGIN_QUOTE
    quote
      text
        with any indentation
    - list item inside quote
      - nested item
    #+END_QUOTE
  - ## h2
    - #+BEGIN_TIP
      **tip**
      - list item inside block
      #+END_TIP
    - ### h3
  `.trim();

    assertEquals(
      outlineMarkdown(input, { listNesting: "none" }),
      expectedOutput,
    );
  });
});

Deno.test("outlineMarkdown handling code blocks", async (t) => {
  await t.step("should handle starting with a code block", () => {
    const input = `
\`\`\`js
console.log("Hello, world!");

console.log("Goodbye, world!");
\`\`\`

# Header
Some text
`.trim();

    const expectedOutput = `
- \`\`\`js
  console.log("Hello, world!");

  console.log("Goodbye, world!");
  \`\`\`
- # Header
  - Some text
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle ending with a code block", () => {
    const input = `
# Header
Some text

\`\`\`js
console.log("Goodbye, world!");
\`\`\`
`.trim();

    const expectedOutput = `
- # Header
  - Some text
  - \`\`\`js
    console.log("Goodbye, world!");
    \`\`\`
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle a code block under a header", () => {
    const input = `
# Header

\`\`\`js
console.log("Hello, world!");

console.log("Goodbye, world!");
\`\`\`
`.trim();

    const expectedOutput = `
- # Header
  - \`\`\`js
    console.log("Hello, world!");

    console.log("Goodbye, world!");
    \`\`\`
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle a code block within a list", () => {
    const input = `
- List item
  \`\`\`js
  console.log("Hello, world!");
  \`\`\`
- Another item
`.trim();

    const expectedOutput = `
- List item
  \`\`\`js
  console.log("Hello, world!");
  \`\`\`
- Another item
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle multiple code blocks", () => {
    const input = `
\`\`\`js
console.log("Block 1");
\`\`\`

# Header

\`\`\`js
console.log("Block 2");
\`\`\`
`.trim();

    const expectedOutput = `
- \`\`\`js
  console.log("Block 1");
  \`\`\`
- # Header
  - \`\`\`js
    console.log("Block 2");
    \`\`\`
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle code blocks together with lists", () => {
    const input = `
\`\`\`text
code block

with multiple lines
\`\`\`
- list item
  - nested item
  - another nested item
\`\`\`
code block 
    with varying
  indentation
\`\`\`
    `.trim();
    console.log(splitIntoChunks(input));

    const expectedOutput = `
- \`\`\`text
  code block

  with multiple lines
  \`\`\`
- list item
  - nested item
  - another nested item
- \`\`\`
  code block 
      with varying
    indentation
  \`\`\`
    `.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });
});

Deno.test("outlineMarkdown handling lists", async (t) => {
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

    #+BEGIN_QUOTE
    with a quote
    that continues here
    #+END_QUOTE
    
  #+BEGIN_QUOTE
  but then there is a quote 
  at the first level
  and it's another quote
  #+END_QUOTE

- then the list goes on

  - sub item after a newline
- and the last one
`.trim();

    const expectedOutput = `
- this is a list
  - with a sub list
    #+BEGIN_QUOTE
    with a quote
    that continues here
    #+END_QUOTE
  #+BEGIN_QUOTE
  but then there is a quote 
  at the first level
  and it's another quote
  #+END_QUOTE
- then the list goes on
  - sub item after a newline
- and the last one
    `.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });
});

Deno.test("outlineMarkdown handling code blocks in lists", async (t) => {
  await t.step("should handle indented code blocks inside lists", () => {
    const input = `
- list item
  - nested item
    \`\`\`text
    code block

    with multiple lines
    \`\`\`
  - another nested item
    \`\`\`
    another code block
    \`\`\`
- another list item
  \`\`\`
  code block 
      with varying
    indentation
  \`\`\`
    `.trim();

    const expectedOutput = `
- list item
  - nested item
    \`\`\`text
    code block

    with multiple lines
    \`\`\`
  - another nested item
    \`\`\`
    another code block
    \`\`\`
- another list item
  \`\`\`
  code block 
      with varying
    indentation
  \`\`\`
    `.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle text after a code block", () => {
    const input = `
- list item
  \`\`\`
  code block
  \`\`\`
  text after code block
- another list item
  - nested item
    \`\`\`
    nested code block
    \`\`\`
    text after nested code block
    `.trim();

    const expectedOutput = `
- list item
  \`\`\`
  code block
  \`\`\`
  text after code block
- another list item
  - nested item
    \`\`\`
    nested code block
    \`\`\`
    text after nested code block
    `.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step("should handle blank lines before/after code blocks", () => {
    const input = `
- list item

  \`\`\`
  code block
  \`\`\`

  text after code block

- another list item

  - nested item

    \`\`\`
    nested code block
    \`\`\`

    text after nested code block
    `.trim();

    const expectedOutput = `
- list item
  \`\`\`
  code block
  \`\`\`
  text after code block
- another list item
  - nested item
    \`\`\`
    nested code block
    \`\`\`
    text after nested code block
  `.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });

  await t.step(
    "should handle code blocks on different levels of nested lists",
    () => {
      const input = `
- list item
  \`\`\`
  code block at first level
  \`\`\`
  - nested item
    \`\`\`
    code block at nested level
    \`\`\`
    - deeper nested item
      \`\`\`
      code block at deeper nested level
      \`\`\`
`.trim();

      const expectedOutput = `
- list item
  \`\`\`
  code block at first level
  \`\`\`
  - nested item
    \`\`\`
    code block at nested level
    \`\`\`
    - deeper nested item
      \`\`\`
      code block at deeper nested level
      \`\`\`
`.trim();

      assertEquals(outlineMarkdown(input), expectedOutput);
    },
  );

  await t.step("should handle edge cases with code blocks", () => {
    const input = `
- list item
  \`\`\`
  code block
  \`\`\`

  text after code block
- another list item
  - nested item
    \`\`\`
    nested code block
    \`\`\`
    text after nested code block
- list item with no blank lines

  \`\`\`
  code block
  \`\`\`
  text after code block
- another list item with no blank lines

  - nested item
    \`\`\`
    nested code block
    \`\`\`
    text after nested code block
    `.trim();

    const expectedOutput = `
- list item
  \`\`\`
  code block
  \`\`\`
  text after code block
- another list item
  - nested item
    \`\`\`
    nested code block
    \`\`\`
    text after nested code block
- list item with no blank lines
  \`\`\`
  code block
  \`\`\`
  text after code block
- another list item with no blank lines
  - nested item
    \`\`\`
    nested code block
    \`\`\`
    text after nested code block
`.trim();

    assertEquals(outlineMarkdown(input), expectedOutput);
  });
});
