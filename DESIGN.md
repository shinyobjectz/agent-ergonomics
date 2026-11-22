# Design: agentergonomics.org

Calm, high-end and alive: soft light on mist, the way a meditation or a science brand would set it. The page breathes.
One breath every 11 seconds (about 5.5 a minute, a resting pace) drives everything that moves on its own.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--mist` | `#f2f3f5` | The ground under the light. |
| `--ink` | `#16171c` | Headings, statements, primary buttons. |
| `--soft` | `#4a4e5c` | Secondary text and asides. At least 4.1:1 on the richest light, 6:1 on mist. |
| `--violet` | `#4a3aa8` | Links, focus rings, list markers, the hover of a button. |
| `--ghost` | `#776d76` | Words a demo cuts, struck through. |
| lights | lilac `#cbc3f5`, sky `#bfd8f4`, sage `#cfe6d8`, apricot `#f6cfb8`, rose `#f1c4cf` | The field and the pearl only. Never text or fills. |

Cards are white at 92% with a long, soft violet-tinted shadow. A fine grain sits over everything so the gradients read as
light rather than as a fill.

## Type

- **Jost** (`--display`) at 300 for headings, tracked tight (-0.035em; -0.02em where a hyphen would read as a strike).
- **Hanken Grotesk** (`--text`) for everything you read.
- **Atkinson Hyperlegible Mono** (`--mono`) for commands and code only.
- All self-hosted variable woff2 (OFL), in site/fonts.

## The light (site/light.js, three.js)

- **The field:** a full-screen shader with four soft lights over mist, their space slowly warped by noise. Each section
  (`data-light` on its element) has its own lights, positions and strength; moving between sections eases them over
  about a second. The pointer adds a faint white glow that trails it.
- **The pearl:** a sphere whose surface swells with the breath, coloured by the section's lights, with an iridescent
  rim. It sits beside the opening statement, steps out of the way through the middle of the page, and returns, fainter,
  behind the closing line.
- Without WebGL, the CSS gradient on `html` stays. With reduced motion, time stops and the light only changes between
  sections.

## Motion (site/motion.js, Motion)

- Headings arrive word by word, from blur to sharp. Everything else rises and sharpens as it enters, staggered within
  its section.
- The idea's four lines draw their rule first, then the line, then its fix.
- The demos play when they come into view: the decision log's problems file in under the fix, the draft's filler is
  struck word group by word group before the rewrite settles, and six of the seven terms are struck before the two
  that replace them arrive.
- With a fine pointer, buttons lean toward it and the install card tilts with it.
- Everything is decoration. With scripts off or reduced motion, the page shows its final state.

## Structure

- `.row`: a content column and an aside column (14 to 21 rem). Under 900 px the aside drops below.
- The opening fills the first screen: the bar, the statement, then the line under it beside the install card.
- Sections are separated by space alone.
