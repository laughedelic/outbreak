- aliases:: test document, converter test
  tags:: test, converter, markdown
  title:: Test Document

# Basic Tasks
- TODO A simple todo task
- DOING An in-progress task
- DONE A completed task
- CANCELLED A cancelled task
	- TODO A nested todo task
	- DONE A nested completed task
		- TODO Deeply nested todo

# Highlights and Formatting
Regular text with ^^highlighted content^^ in the middle.
Text with ^^multiple^^ ^^highlights^^ in it.
Mixed formatting: **bold text with ^^highlight^^ inside** and *italic with ^^highlight^^ too*.
Edge case: ^^highlight with **bold** inside^^

# Wiki-links and Aliases
Simple link: [[Page Name]]
Link with alias: [Custom Title]([[Page Name]])
Link in text: This is a [Custom Title]([[Page Name]]) in a sentence.
Nested cases:
- TODO Task with [Custom Title]([[Page Name]]) inside
- Text with ^^highlight and [Custom Title]([[Page Name]]) inside^^

# Block Quotes and Callouts
Regular quote:
#+BEGIN_QUOTE
This is a simple
block quote that
spans multiple lines
#+END_QUOTE

Callout examples:
#+BEGIN_NOTE
This is a note callout
with multiple lines
#+END_NOTE

#+BEGIN_WARNING
A warning callout with a task:
- TODO Todo inside callout
And a highlight: ^^highlighted text^^
#+END_WARNING

# Media Embeds
![[image.png]]
![[My Note]]
![[Audio File.mp3]]

# Complex Nesting Cases
#+BEGIN_TIP
Callout with multiple elements:
- TODO Task one
- DONE Task two with ^^highlight^^
- Link to [Custom Title]([[Page Name]])

#+BEGIN_QUOTE
Nested quote inside callout
with [alias]([[Page Name]]) and ^^highlight^^
#+END_QUOTE
#+END_TIP

# Edge Cases
^^Unterminated highlight
[Unterminated alias
^^Multiple ^^nested^^ highlights^^
[[Page Name|Alias with ^^highlight^^ inside]([[Unterminated wiki link
[[Page Name]])
- DONE Task with unclosed [alias]([[link
- TODO ^^Task description with [[Page Name]]) inside highlight==

Regular text continuing...