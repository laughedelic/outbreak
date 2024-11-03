import { assertEquals } from "jsr:@std/assert";
import { convertToLogseq } from "./outliner.ts";

Deno.test("convertToLogseq", async (t) => {
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

    assertEquals(convertToLogseq(input), expectedOutput);
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

    assertEquals(convertToLogseq(input), expectedOutput);
  });
});
