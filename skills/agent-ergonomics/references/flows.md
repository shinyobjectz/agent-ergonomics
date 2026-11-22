# Flows, states and errors

## The happy path

The happy path is the product. Write it first, as the reader experiences it:

1. Number the steps from the reader's side. Each is something they see and something they do or decide.
2. For each step, write what they need to know at that moment, and nothing more.
3. Mark the moment they first get value. Count the steps and decisions before it. Each one has to justify itself:
   can it move later, get a good default, or go?
4. Attach each edge case to the step where it happens, with its own way back.

Test it by walking it cold. Read only what's on screen at each step, or only what the agent's tool returns, and
check that the next action is obvious without knowing the plan.

## States

Every screen, component and command has more states than the one in the mockup. Write copy for each that can occur:

| State | What it says |
| --- | --- |
| Empty | What goes here, why you'd want it, and the action that adds the first one |
| Loading | What's happening, if it takes more than a moment. Progress when it's long |
| Partial | What's ready and what's still coming |
| Success | What happened and where the result is. Quiet when the result is visible anyway |
| Error | What happened, what to do next, and whether anything was lost |
| Offline / no permission | What still works, and how to regain the rest |
| First run vs returning | The first run teaches. Returning gets straight to work |

## Errors

An error message is a step in the flow, not an apology. It has up to three parts:

1. **What happened**, in the reader's terms: "The file is larger than 2 GB", not "E_SIZE_LIMIT".
2. **Why**, only when it changes what they do.
3. **What to do now:** the fix, a valid example, or the way back. For an agent, also whether retrying will help.

Never blame the reader, never hide the fact that something failed, and never show a stack trace as the only message.
If data was kept, say so. If it was lost, say so.

## Labels and microcopy

- Buttons name what they do and to how many: "Delete 3 files", "Send invite".
- Destructive actions say what's lost, and offer undo where possible rather than a confirmation dialog.
- Field labels are nouns the reader uses. Hints give an example of a valid value.
- Settings say what changes when they change, not what the internal flag is called.

## Navigation and names

- One name per thing on every screen, in every message and in the docs.
- Section names come from the reader's tasks ("Invite your team"), not the system's parts ("Members module").
- A reader landing on any screen from a link can tell where they are and how to get back.
