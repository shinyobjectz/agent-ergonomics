# The concept ledger

List every concept and term the reader meets on their first path, in the order they meet it. Include UI labels,
headings, nouns in copy, names in tool descriptions and CLI output, and anything the reader has to understand to
continue.

## Format

| # | Term | First met | Explained there? | Example given? | Needed then? | Other names | Reader acts on it? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Project | Home screen heading | Yes, by the empty state | Yes | Yes | "Workspace" in settings | Yes |
| 2 | Pipeline | Home screen sidebar | No | No | No, first used in step 6 | "Flow" in docs | Later |
| 3 | Runner | Error after first run | No | No | Yes | — | No: an internal part |

## Reading it

- **Explained there = no and needed then = yes:** the reader is stuck at that point. Explain it where it's met, with
  an example, or move the step that needs it.
- **Needed then = no:** the concept arrived too early. Move it to where it's needed, or past the first success.
- **Other names filled in:** a synonym. Choose one name from the reader's vocabulary and use it everywhere.
- **The same term on two rows with different meanings:** a collision. Rename one.
- **Reader acts on it = no:** the term is an internal part leaking into the reader's view. Describe what it does in
  plain words, or hide it.
- **Count the rows before the first success.** That's the concept cost of getting started. Every row removed beats
  every row explained.

## Example of a collapse

Before, a new user meets: workspace, project, board, pipeline, stage, runner, and job, before running anything.

After asking which of these the user must distinguish to act:

- Workspace and project were the same thing to every user with one workspace. They become one: **project**.
- Board, pipeline and stage were three views of one list. They become **steps**.
- Runner and job are internal. The user sees "Running step 2 of 5".

The user now meets two terms before their first success: project and steps.
