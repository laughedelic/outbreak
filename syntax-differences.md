
# Obsidian-flavored markdown vs. Logseq org-mode inspired markdown

## Problem

- Obsidian uses some custom markdown syntax
	- <https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown>
	- plugins like Tasks and Dataview add even more syntax, plus different query blocks
- Logseq also uses a weird interpretation of markdown/org-mode specialized in _outlining_
	- <https://docs.logseq.com/#/page/markdown>
	- it has a custom syntax for tasks, properties, aliases, admonitions, etc.

## Syntax differences

#### Tasks

- Here Obsidian assumes usage of the Tasks plugin
	- <https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax#Task+lists>
	- <https://publish.obsidian.md/tasks> is the de-facto standard plugin for task management in Obsidian
	- Any global global filter suffix (like `#task`) is omitted and should be removed for conversion.
	- Tasks plugin has many more optional states, but they don't map onto Logseq anyway
- Logseq doesn't understand `[ ]` syntax at all, so unlike in Obsidian/Tasks, there is no confusion between simple checkboxes and todo-tasks
	- <https://docs.logseq.com/#/page/tasks>
	- Task management in Logseq is built-in and more intentional

| Obsidian | Logseq                |
| -------- | --------------------- |
| `- [ ]`  | `- TODO` or `- LATER` |
| `- [/]`  | `- DOING` or `- NOW`  |
| `- [x]`  | `- DONE`              |
| `- [-]`  | `- CANCELLED`         |

> [!note]  
>
> Only `[ ]` and `[x]` are standard (common?) Markdown, other symbols are the default set from the Tasks plugin that map well on the built-in Logseq statuses

#### Global filter

- Obsidian Tasks: this is used to filer and treat only a subset of checkboxes as tasks
	- <https://publish.obsidian.md/tasks/Getting+Started/Global+Filter>
	- It should be configurable in the converter
		- The keyword for the filter
		- If it's set, it will be removed, otherwise it will be ignored
	- Example:
		- `- [ ] #task do something` with `#task` tag as the filter keyword,
		- this should become: `- TODO do something`

#### Dates

> [!note]  
> For now I will focus only on the emoji-style dates (Dataview-style is similar to Logseq properties, but I don't use it anyway)

- Obsidian Tasks: <https://publish.obsidian.md/tasks/Getting+Started/Dates>
	- Dates appear at the end of the task description as an emoji + a date
- Logseq: <https://docs.logseq.com/#/page/tasks/block/deadline%20and%20scheduled>
	- Deadline/scheduled date is added on a separate line in the block
	- These are not properties, just strings that get some special rendering

| Date         | Obsidian       | Logseq                                                    |
| ------------ | -------------- | --------------------------------------------------------- |
| Due/Deadline | `📅 YYYY-MM-DD` | `DEADLINE: <YYYY-MM-DD ddd>`                              |
| Scheduled    | `⏳ YYYY-MM-DD` | `SCHEDULED: <YYYY-MM-DD ddd>`                             |
| Start        | `🛫 YYYY-MM-DD` | N/A                                                       |
| Created      | `➕ YYYY-MM-DD` | N/A (optionally: add `created:: [[YYYY-MM-DD]]` property) |
| Done         | `✅ YYYY-MM-DD` | N/A                                                       |
| Cancelled    | `❌ YYYY-MM-DD` | N/A                                                       |

- Logseq has a time tracking feature: <https://docs.logseq.com/#/page/tasks/block/time%20tracker>
	- it records the dates of task state transitions in a "logbook"
	- this roughly corresponds to the task Start and Done dates from the Obsidian Tasks plugin

##### Recurring/repeating Tasks

- Obsidian Tasks: <https://publish.obsidian.md/tasks/Getting+Started/Recurring+Tasks>
- Logseq: <https://docs.logseq.com/#/page/6667036b-efe4-4c29-9dc7-52e3d1233838>

> [!missing] Out of scope
>
> Because Tasks plugin uses natural language dates, automatic conversion would be complicated

#### Priorities

- Obsidian Tasks: <https://publish.obsidian.md/tasks/Getting+Started/Priority>
	- Has 5 explicit levels
- Logseq: <https://docs.logseq.com/#/page/tasks/block/priorities>
	- Only has 3 explicit levels: A, B, C

| Priority          | Obsidian Tasks | Logseq |
| ----------------- | -------------- | ------ |
| highest           | 🔺              | `[#A]` |
| high              | ⏫              | `[#A]` |
| medium            | 🔼              | `[#B]` |
| normal (implicit) |                |        |
| low               | 🔽              | `[#C]` |
| lowest            | ⏬️              | `[#C]` |

> [!todo]  
> This mapping could be made configurable

#### Dependencies

- Obsidian Tasks: <https://publish.obsidian.md/tasks/Getting+Started/Task+Dependencies>
	- Tasks can have an ID and other tasks can reference that ID
	- Example:
		- `- [ ] do this first 🆔 abcdef` (identifiable)
		- `- [ ] do this after first ⛔ abcdef` (depends on the above)
- Logseq: not supported
	- But it could be done via block references

> [!missing] Out of scope
>
> Although doable, it's not a priority, so for now we can ignore dependencies

### Wiki-links (page links) with an alias

- Obsidian uses a more common wiki-style syntax for aliases: `[[wiki link|alias]]`
	- <https://help.obsidian.md/Linking+notes+and+files/Aliases#Link+to+a+note+using+an+alias>
- Logseq uses a core-markdown style treating `[[...]]` as a URL: `[alias]([[wiki link]])`
	- <https://docs.logseq.com/#/page/aliases%20and%20external%20links>
	- it does the same with block references `((…))`

### Frontmatter

- Obsidian uses a YAML block at the beginning of the file
	- <https://help.obsidian.md/Editing+and+formatting/Properties>

```markdown
---
aliases: ["buh", "bar"]
tags:
  - foo
  - meh
___

text
```

- Logseq uses custom properties format in the first block (bullet-point) of the page
	- <https://docs.logseq.com/#/page/properties>

```
- aliases:: buh, bar
  tags:: foo, meh
- text
```

### Block quotes

- Obsidian: standard markdown:

```markdown
> some
> text
```

- Logseq:

```
#+BEGIN_QUOTE
some
text
#+END_QUOTE
```

### Callouts (Admonitions)

- Obsidian uses basic block quote syntax + a callout type
	- <https://help.obsidian.md/Editing+and+formatting/Callouts>

```markdown
> [!tip]
> some useful
> tip note
```

- Logseq uses org-mode based syntax for blocks
	- <https://docs.logseq.com/#/page/advanced%20commands>
	- [Admonitions | Asciidoctor Docs](https://docs.asciidoctor.org/asciidoc/latest/blocks/admonitions)

> Type `<` to kick off autocompletion and list of advanced commands.  
> When a command is selected it expands to a `BEGIN…END` section inside a block. There can be multiple `BEGIN…END` sections in a block.

```
#+BEGIN_TIP
some useful
tip note
#+END_TIP
```

### Embeds (inline references)

- Obsidian: `![[page name]]`
	- <https://help.obsidian.md/Linking+notes+and+files/Embed+files>
	- similar to the `![]()` inline image syntax
- Logseq: `{{embed [[page name]]}}`
	- <https://docs.logseq.com/#/page/page%20embed>
	- works same for block embeds
	- different ways to [embed media](https://docs.logseq.com/#/page/embed%20media%20-%20audio%2C%20photos%2C%20videos)

> [!TODO]
> embedding blocks: `![[page#^reference_id]]` vs. `{{embed ((block reference))}}`

#### Video embeds

- Obsidian: `![](https://www.youtube.com/watch?v=video_id)`
	- standard markdown syntax
- Logseq: `{{video https://www.youtube.com/watch?v=video_id}}`
	- https://docs.logseq.com/#/page/embed%20media%20-%20audio%2C%20photos%2C%20videos

### Highlights

- Obsidian: `Text with ==a highlight== in the middle`
	- <https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax#Bold%2C+italics%2C+highlights>
- Logseq: `Text with ^^a highlight^^ in the middle`
	- <https://docs.logseq.com/#/page/markdown>

### Numbered lists (ordered lists)

- Obsidian: standard markdown syntax
	- <https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax#Lists>
	- Note that the numbers don't matter for the rendering, so it's common to use `1.` for each item to be able to reorder items easily.

```markdown
1. one
2. two
3. three
   and a half
```

- Logseq: numbered lists are the same as other bullet lists (i.e. generic blocks), but with a special hidden property: `logseq.order-list-type:: number`
	- <https://docs.logseq.com/#/page/numbered%20list>
	- there is also a community plugin for this: <https://github.com/sethyuan/logseq-plugin-ol/blob/master/README.en.md>
	- Logseq figures out the numbering automatically (nice), but the internal syntax is just bizarre:

```markdown
- one
  logseq.order-list-type:: number
- two
  logseq.order-list-type:: number
- three
  logseq.order-list-type:: number
  and a half
```
