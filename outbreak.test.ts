import { assertEquals } from "jsr:@std/assert";
import { markdownToLogseq } from "./outbreak.ts";

Deno.test("Comprehensive test", async (t) => {
  await t.step("full document", () => {
    const input = `
---
aliases: ["note1", "test note"]
tags:
  - test
  - example
---

# Test Document

This is a paragraph with ==highlighted text== and a [[wiki link|custom alias]].

## Tasks and Dates

- [ ] #task Basic task
- [x] #task Completed task with dates 📅 2024-03-15 ✅ 2024-03-20
- [/] #task In progress task ⏳ 2024-04-01
- [-] #task Cancelled task ❌ 2024-03-10

### Priorities

- [ ] #task High priority task ⏫
- [ ] #task Medium priority task 🔼
- [ ] #task Low priority task 🔽

## Lists and Quotes

1. First item
2. Second item
   - Nested bullet
     > A quote
     > inside a bullet

   - Another bullet
     1. Nested number
        \`\`\`code
        A code block

        with multiple lines
        \`\`\`

        and then text after code
     2. Another number

> A simple quote
> spanning multiple lines

> [!note]
> This is a callout
> with multiple lines

## Embeds and Media

![[another page]]
![](https://www.youtube.com/watch?v=123456)

\`\`\`python
def hello():
    print("Hello World!")
\`\`\`
`.trim();

    const expected = `
alias:: note1, test note
tags:: test, example

- # Test Document
  - This is a paragraph with ^^highlighted text^^ and a [custom alias]([[wiki link]]).
  - ## Tasks and Dates
    - TODO Basic task
    - DONE Completed task with dates
      DEADLINE: <2024-03-15 Fri>
      .completed:: [[2024-03-20]]
    - DOING In progress task
      SCHEDULED: <2024-04-01 Mon>
    - CANCELLED Cancelled task
      .cancelled:: [[2024-03-10]]
    - ### Priorities
      - TODO [#A] High priority task
      - TODO [#B] Medium priority task
      - TODO [#C] Low priority task
  - ## Lists and Quotes
    - First item
      logseq.order-list-type:: number
    - Second item
      logseq.order-list-type:: number
       - Nested bullet
         #+BEGIN_QUOTE
         A quote
         inside a bullet
         #+END_QUOTE
       - Another bullet
         - Nested number
           logseq.order-list-type:: number
            \`\`\`code
            A code block

            with multiple lines
            \`\`\`
            and then text after code
         - Another number
           logseq.order-list-type:: number
    - #+BEGIN_QUOTE
      A simple quote
      spanning multiple lines
      #+END_QUOTE
    - #+BEGIN_NOTE
      This is a callout
      with multiple lines
      #+END_NOTE
  - ## Embeds and Media
    - {{embed [[another page]]}}
      {{video https://www.youtube.com/watch?v=123456}}
    - \`\`\`python
      def hello():
          print("Hello World!")
      \`\`\`
      `.trim();

    assertEquals(markdownToLogseq(input), expected);
  });
});
