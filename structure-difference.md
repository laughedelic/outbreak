# Document structure difference between Obsidian and Logseq

Apart from the different Markdown extension syntax, there is a big difference in how Obsidian and Logseq treat the document structure implied by the Markdown headings hierarchy. 

Obsidian uses standard flat markdown structure where the headings are just a way to style the text and the paragraphs following the heading are considered at the same level as the heading. So the document structure is only implied by the visual hierarchy of the headings. It can become more apparent when you fold the document to see the headings hierarchy or add a table of contents.

Logseq, on the other hand, perceives any document as an outline with a rigid structure of nested lists, where every item is a block of information. The hierarchy is made explicit through the bullet points and indentation. If any of the blocks happens to contain the Mardkown heading syntax, it will be styled as a heading, but that won't influence the structure of the document.

## Problem

- Obsidian markdown structure is flat, with headings only implying the structure of the document
  - https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax#Headings
- Logseq treats every document as an outline with an explicit structure of nested lists and headings are just a way to style the text
  - https://docs.logseq.com/#/page/what%20is%20indentation%20and%20why%20does%20it%20matter%3F

## Solution

To convert a document from Obsidian to Logseq, you need to transform the flat structure of the document into a nested list structure. This can be done by using the headings hierarchy to create an explicit nested lists in Logseq with proper identation. This requires not only transforming the headings into list items but also moving the paragraphs following the headings into the nested lists.

## Illustration

Here is an example Markdown document:

```markdown
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
```

It should be converted to a list where every paragraph is a separate item:

```markdown
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
```

Here anything in the scope of a heading becomes a nested list item, and the paragraphs following the heading are moved inside the nested list. This way the structure of the document is preserved and can be easily navigated in Logseq.

Lists are nested under the previous paragraph, so that the list structure stands out in the overall document structure. But the conversion shouldn't affect the structure inside any explicit Markdown list, only indent it to the correct level.

Any other block elements like blockquotes, code blocks, or media embeds should be treated as separate paragraphs.

### Concerns

- Stricter Markdown rules require surrounding code blocks with empty lines, which makes them seprarate paragraphs and they will be treated as separate list items in Logseq
- The lists following a paragraph will be nested under that paragraph's block, but they are not always semantically related to that paragraph in the original document
- Headings's level may not always increase by one, but the outline structure must increment one level at a time

> [!note]
>
> Logseq can use tabs or spaces for indentation depending on configuration, so the conversion tool should be able to use either and have an option to specify the indentation type.
> https://discuss.logseq.com/t/specify-indentation-type-changing-the-default-font/2703/6

#### Alternative approach

Another way could be to for the paragraphs following the heading to be merged into the same block as the heading:

```markdown
- # h1
  
  paragraph
  - ## h2
    
    next paragraph
    - a list
    - of items
      - and nested items
      - with more items
        - inside
        - them
    - another paragraph
```

##### Concenrns

- big chunks of text can be put into the same block after the heading
- paragraphs after lists are at the same level as the list items

### A more complex example

```markdown
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
```

Should be converted to:

```markdown
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
```

This example illustrates:

- how subheadings are nested under the parent heading (e.g. h3 and h4), but then return to the same level as the parent heading depending on the level (e.g. h2-2),
- how the misleveled headings (h4) are still nested under the parent heading (h2-2) even if they are out of order, because the outline structure must increment one level at a time.

> [!idea]
> 
> Converter tool could fix the misleveled headings by moving them to the correct level under the parent heading.
> This behaviour should be configurable, as it may not always be desired.