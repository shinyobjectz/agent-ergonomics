# Agent ergonomics

Three skills for building code, tools and products that agents and people can use without guessing.

The idea behind all three: everything a reader needs should be where they are, and nothing they don't need should
be. The reader might be an agent changing your code, an agent calling your CLI, or a person opening your app for the
first time. When what they need lives somewhere else (a copy in another file, a flag only the docs mention, a term
defined three screens later, a sentence that only makes sense to whoever was in the chat), they guess. People guess
slowly. Agents guess confidently, and break things without noticing.

## The skills

| Skill | What it does | Reach for it when |
| --- | --- | --- |
| **agent-ergonomics** | Untangles code so a typical change lands in one place, and redesigns the surfaces agents act through (CLIs, MCP tools, APIs, skills, errors) so they can tell what to do and whether it worked. Proves both with numbers taken before and after. | A change keeps touching five files. Agents misuse a tool or loop on it. You're planning a big refactor. |
| **purpose-built** | Writes and reviews copy, docs, flows and plans for the reader at the moment they read it: no AI tells, no padding, no broken states, nothing left over from the conversation that produced it. | Text sounds generated or generic. A flow has dead ends. Docs mention "the new X" to readers who never saw the old one. |
| **first-read** | Makes an app, tool or page understood on first contact: models how its people and agents actually read, keeps a ledger of every concept they meet, collapses the taxonomy, and tests with cold readers. | People say it's confusing. Onboarding needs a glossary. The product has six words for three things. |

agent-ergonomics hands its text to purpose-built and its concepts to first-read, so running the first often runs all
three.

## Install

In Claude Code:

```sh
claude plugin marketplace add shinyobjectz/agent-ergonomics
claude plugin install agent-ergonomics@agent-ergonomics
```

With another agent that reads `SKILL.md` files, copy the folders under `skills/` into its skills directory.

## Using them

The skills trigger on their own when a task fits. You can also ask for one by name:

- "Untangle this codebase and give me the decision log before changing anything."
- "Our CLI is used by agents. Make it agent-friendly, and measure it first."
- "Rewrite the onboarding copy so it's written for a first-time user."
- "Walk the first five minutes of this app as a new user and list every concept they meet."

agent-ergonomics asks before two optional additions: removing comments that only restate the code, and removing
tests that wouldn't catch a real bug. It never deletes either without asking.

## Credits

The untangling method adapts caldoai's untangle-codebase. The agent-as-user process draws on StevenLi-phoenix's
aci-design-process. The list of AI tells builds on hardikpandya's stop-slop and Wikipedia's "Signs of AI writing".
See [NOTICE](NOTICE).

MIT licensed. More at [agentergonomics.org](https://agentergonomics.org).
