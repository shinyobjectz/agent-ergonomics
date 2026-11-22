# Untangling: the signs and the fixes they point to

The question for every piece of code: **should these pieces change together?** Pieces that must change together end
up together, pieces that don't aren't tied, and everything depends on what changes less.

## Hidden links: must change together, and nothing shows it

- **Copies of logic or values.** Change one and the others must change too. Look for the same helper defined in
  several modules (hashes, colour parsing, number reads), constants repeated in two languages, and defaults written
  out again on the far side of a boundary.
- **Globals set in one place and read in another.** Environment variables, singletons, files one module writes and
  another reads. Change the writer and the reader breaks, and nothing in either shows the link. Watch for one process
  driving another by setting environment variables on it.
- **Stringly typed protocols.** A key like `"fog_color"` written by one module and read by name in six others.
  Renaming it means finding every copy, and a missed one fails silently.
- **A feature split across folders by layer.** One change needs the UI folder, the API folder, the model folder and
  the docs. Git co-change shows it: pairs of modules in different folders that change together in a large share of
  their commits.
- **A call order or convention callers just have to know.** "Call init before load", "set this flag first", "this
  field only updates on the first frame".
- **Lists kept in step by hand.** Flags parsed in one file and documented in another, types in one language and the
  parser in another, a registry and the switch that dispatches on it. Checks that compare such lists are the symptom.

## Needless links: tied together, changing for different reasons

- **Callers that depend on internals.** The internals change for their own reasons, and the callers break anyway.
- **Stable code importing volatile code.** The stable code has to change whenever the volatile code does. Check the
  direction of every import against how often each side changes in git.
- **A general function with a parameter only one caller understands.** The function changes whenever that caller's
  workflow does.
- **Shallow modules.** The interface is nearly as large as the implementation, so it changes whenever the internals
  do. Tiny modules with one user are often this.
- **A module with two jobs.** It's imported for one and rebuilt for the other. A "paths and settings" module that
  everything imports is a typical case.

## Surplus: no reason of its own to change

- **Pass-through wrappers.** They change only when the thing they wrap does.
- **Extension points and configuration for things that never vary.** Nothing will ever change them.
- **Dead code**, including leftovers on disk that agents' searches still find: untracked folders, stale build
  output, files hidden by local ignore rules.

## Special cases: requirements the design never accounted for

Collect them all, then read them together. Each one says something the system needs.

- An `if` for one value, or a `match` arm that exists for one caller.
- A parameter added for a specific caller.
- A swallowed error: `catch {}`, `let _ =`, `.ok()`, `unwrap_or_default()` on input that could be wrong.
- A retry, a sleep, or a poll where an event exists.
- A disabled or skipped test.
- An exception to a rule, such as an allow list, a "facility" carve-out, or a raised limit with a note explaining why.
- A comment explaining a workaround.

Keep the special cases that follow from the world outside the code (a real platform difference, a hardware limit),
with the reason written at the site. Remove the rest by fixing what made them necessary.

## Patterns that point to the fix

| What you see | What it usually means | Fix |
| --- | --- | --- |
| Several tools that check one list against another | Two sources of truth | Make one the source and generate the other |
| A layer rule with dozens of exceptions | The rule draws the line in the wrong place | Name the layer the exceptions form and move it |
| Copies kept because a rule forbids the import | The shared piece sits too high | Move it down to where both can use it |
| Per-kind code deciding which fields update | No generic path from data to state | One apply path for every field of every kind |
| Hundreds of environment flags read anywhere | Settings nobody declared | One registry: name, type, default, doc; values passed in |
| A new field touches five places | The schema is written out in five places | One schema; generate the rest |
| Hub modules sitting just under a size limit | Split by line count, not by reason to change | Split along co-change seams; merge one-user fragments |
| A prop or flag misspelled with no error | Untyped input read with defaults | Parse into a type; reject unknown names with the valid ones listed |
| Sleeps and polls around an API | An event or callback being ignored | Wait on the event |

## Writing the redesign

Work out the fixes as if today's requirements had been known from the start. The best fix usually removes several
problems and several special cases at once, and often looks nothing like any one of them. Order fixes by how much of
the list each removes. Mark any fix that reverses a decision the user made, and ask before doing it.
