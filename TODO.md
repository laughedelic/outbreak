## TODO list

This is just a copy from my internal development notes, unfiltered and unsorted. I'm adding it with the initial release to give some context for anyone who might be interested in contributing. Some of the tasks have explanations or are canceled (`[-]`) and kept for reference. This list uses the Obsidian Tasks plugin syntax.

### Testing

- [ ] #task generate more tests 🔼
- [x] #task run on some real data and identify unhandled edge cases 🔼 ✅ 2024-11-12
- [-] #task more tests for video embeds (with an alias?) ❌ 2024-11-12
- [-] #task a way to alert potential data loss: if the content of the file has changed more than by 5%, log the warning, or even a diff ❌ 2024-11-18
	- tried this, but it didn't give good enough feedback: 
		- percentage is relative to the note's size
		- there are some disproportional changes, like the numbered lists (can be worked around) or indentation
	- this could potentially work, but it's not as simple as I initially thought
- [ ] #task copy parts of the Obsidian's help vault with examples of markup, use it as the input for snapshot testing 🔼

### Features

- [x] #task Support more Markdown features and plugins used in Obsidian and Logseq ✅ 2024-11-11
	- [x] #task handle [numbered lists](https://docs.logseq.com/#/page/numbered%20list) 🔼 ⏳ 2024-11-04 ✅ 2024-11-05
	- [x] #task Deeper Obsidian Tasks plugin support: due date, scheduled, etc. ⏫ ⏳ 2024-11-04 ✅ 2024-11-11
		- [x] #task remove id/depends-on ✅ 2024-11-11
		- [-] #task configure how normal checkboxes are processed ❌ 2024-11-11
		- [x] #task done/completion date property ✅ 2024-11-11
			- <https://github.com/DimitryDushkin/logseq-plugin-task-check-date>
			- <https://github.com/YU000jp/logseq-plugin-confirmation-done-task>
	- [-] #task handle basic [templates](https://docs.logseq.com/#/page/templates) ❌ 2024-11-11
- [x] #task A full migration script that can handle the entire vault, including file renaming and folder restructuring. 🔼 ⏳ 2024-11-04 ✅ 2024-11-07
	- [x] #task convert to Logseq's file structure 🔼 ✅ 2024-11-07
	    - daily notes: `journals/YYYY-MM-DD.md` (flat structure, date format is partially configurable)
		    - [x] #task `cat .obsidian/daily-notes.json | jq -r '.format'` ✅ 2024-11-07
		    - `cat .obsidian/plugins/periodic-notes/data.json | jq -r '.daily.format'`
		    - weekly/monthly/yearly?
			    - <https://github.com/YU000jp/logseq-plugin-show-weekday-and-week-number/>
	    - [x] #task assets: `assets/` (flat structure) ✅ 2024-11-07
		    - `cat .obsidian/app.json | jq -r '.attachmentFolderPath'`
	    - [x] #task pages: `pages/` (flat structure), all non-daily notes can be moved there without changing the subfolder structure ✅ 2024-11-07
	    - [x] #task folder structure to namespaces ✅ 2024-11-07
	- [-] #task interactive migration script with progress report and error handling (nice to have) 🔽 ❌ 2024-11-06
- [-] #task failsafe: don't run on a directory if it has `.obsidian` folder 🔽 ❌ 2024-11-06
- [-] #task consider using <https://jsr.io/@std/front-matter> ❌ 2024-11-05
	- this module doesn't have parsing options (spoils dates) and uses yaml parser under the hood anyway
- [x] #task unindent frontmatter/properties ✅ 2024-11-05
	- I noticed that once Logseq imports a file, it removes the bullet-point from the first block with the page properties
- [x] #task optionally treat any non-markdown files as assets (or configure a set of patterns) ✅ 2024-11-11
- [-] #task config: space vs. tabs indentation 🔽 ❌ 2024-11-12
- [-] #task Treating H1 as a page title property 🔽
	- `title::` property is ignored, so maybe instead there should be an option either to keep H1, to remove it, or to use it as the page filename (? maybe a bad idea)
- [-] #task remove single H1? 🔽 ❌ 2024-11-12
- [x] #task different list nesting behavior ✅ 2024-11-04
- [x] #task add an explicit mapping from callouts to admonitions/blocks 🔼 ✅ 2024-11-10
	- Logseq supports some Orgmode blocks, but not all
	- <https://docs.logseq.com/#/page/advanced%20commands>
- [x] #task additional date formats for daily notes/journals ✅ 2024-11-12
- [x] #task remove `created` property from the journal entries ✅ 2024-11-13
- [x] #task link the date in `created` property to the journal date format ✅ 2024-11-12
- [-] #task detect name conflicts: two pages with different filenames, but same `title` property
	- for now, just remove the title property because it has special meaning in Logseq
- [x] #task replace `[[name|name]]` with `[[name]]` ✅ 2024-11-12
- [x] #task asset links have to use relative path instead of a wiki-style reference ⏫ ✅ 2024-11-12
- [x] #task bug: `#+END_` gets split from the begin block
	- example in the people notes (e.g. Darin)
	- it also gets its own page because it looks like a tag
	- this happens because of the task-blocks cleanup
		- added second pass-through to remove nested callouts
	- consider it closed, but it's not part of the core functionality
- [ ] #task translate `%%` comments to `#+BEGIN/END_COMMENT` ⏬ 
- [x] #task bug: remove properties with `null` value ✅ 2024-11-13
- [ ] #task refactor: split code into translation rules and have separate tests for each
- [ ] #task factor out all existing configuration

### CI automation

- [ ] #task add release automation 🔽 🆔 release-ci
- [ ] #task release a single compiled script (`deno compile`) that can be run directly without Deno 🔽 ⛔ release-ci

### Documentation

- [x] #task add instructions on how to download the scripts or use Deno with URLs 🔽 ✅ 2024-11-20
- [ ] #task list all conversion rules with examples ⏬
- [ ] #task document non-goals: what's out of scope
	- query blocks and macros
	- canvas/whiteboards
	- ~~[namespaces](https://docs.logseq.com/#/page/namespaces)?~~ 🤔 namespaces should be used for folder structures
		- but that requires updating all references to the renamed pages
	- citations

### Bugs

- [x] #task property keys can't have spaces in Logseq (replace with `-`) ✅ 2024-11-12
- [-] #task wrap tag values with spaces into brackets ❌ 2024-11-12
- [-] #task italic in quotes should use `*` because `_` doesn't render (bug in Logseq?) ❌ 2024-11-13
	- looks like a bug in Logseq: `_` generally works, but sometimes doesn't when it's at the beginning of a line (in a quote block), not fixing it
- [x] #task daily notes change date format, but their references are not updated ⏫ ✅ 2024-11-13
	- it would be nice to update the references, but it would require a file index, because right now translation and planning are mostly independent 
	- for now, solved by adding an alias property to each renamed journal
- [x] #task bug: data loss! a quote inside a list gets cut out 🔺 ✅ 2024-11-14
	- it probably applies to any indented block quotes
	- it was a bug in the outliner: newlines in lists
- [x] #task bug: missing newlines inside code blocks and issues with codeblocks inside lists ✅ 2024-11-14
- [x] #task bug: `#+END_` gets split into a separate chunk ✅ 2024-11-15
- [x] #task `---` should split chucks ✅ 2024-11-15
- [x] #task one heading after another, gets treated as a paragraph ✅ 2024-11-14
- [x] #task newlines inside codeblocks get eaten up by the outliner ✅ 2024-11-16