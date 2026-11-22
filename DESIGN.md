# Design: agentergonomics.org

The site is a paper form whose instructions are printed in the margin beside the box they govern, so the page shows
its own idea: what the reader needs sits where they need it.

## Ink and paper

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#ffffff` | The ground. Form stock, never cream. |
| `--ink` | `#c8102e` | Everything printed: rules, box frames, margin notes, labels, links, focus rings, selection. 5.9:1 on white. |
| `--ink-rule` | `#e8a3ad` | Inner rules between lines of a box. |
| `--fill` | `#141414` | Everything filled in: statements, headings, skill names, examples, commands. |
| `--ghost` | `#9a6168` | Words a demo cuts. Struck with a 1.5 px ink line, still readable at 4.9:1. |

## Type

- **Atkinson Hyperlegible Next** (`--hand`) for filled-in content and headings. Display at 700 with tight tracking.
- **Public Sans** (`--print`) for the printed form: margin notes, box labels, navigation.
- **Atkinson Hyperlegible Mono** (`--mono`) only for commands and code.
- All three are self-hosted variable woff2 files in site/fonts (OFL).

## Structure

- `.row` is the form's line: a content column and a margin column (15 to 22 rem). Under 860 px the margin note drops
  below its box.
- `.note` is a margin instruction: ink, 1 px rule on its left, a dashed leader pointing back to its box.
- `.box` is a framed field with an optional `.box-label` header row.
- Sections are separated by full-width 1 px ink rules.

## Motion

One moment: as each skill demo comes into view, ink lines strike the cut words and the rewrite settles in. Content is
visible without JavaScript and with reduced motion.
