# Agent ergonomics

A skill that makes your code, tools and writing easy to use for both of their consumers: the people and the agents
who read them.

People and agents read differently. People scan and take the first option that looks good enough; agents read every
word literally and act on a misreading with confidence. But they fail on the same things: something they need lives
somewhere else, one thing has two names, an error doesn't say what to do next, a sentence only makes sense to
whoever was in the chat. So UX and AX are one job, and agents, being the stricter reader, are the better way to
measure it.

## What it works on

| Layer | The question it asks | Reach for it when |
| --- | --- | --- |
| **Code** | Should these pieces change together? | A small change touches five files. You're planning a big refactor. |
| **Interfaces:** CLIs, APIs, MCP tools, errors | Can the reader tell what to do and whether it worked, from what they see? | Agents misuse a tool, loop on it, or ignore it. |
| **Words:** copy, docs, messages, plans | Is every sentence for the person or agent reading it, right now? | Text sounds AI-written or generic. Docs mention "the new X" to readers who never saw the old one. |
| **Concepts:** names, terms | Can a newcomer act after one look? | People say it's confusing. The product has six words for three things. |

It gathers evidence first (git history, the dependency graph, agent transcripts, a cold read by a small model),
writes a plan with each fix above the problems it solves, takes numbers before and after, and checks every change
against both readers.

## Install

For any agent that reads skills (Codex, Cursor, Claude Code, Cline, Amp and many more):

```sh
npx skills add shinyobjectz/agent-ergonomics
```

It asks which agents to install for. As a Claude Code plugin instead:

```sh
claude plugin marketplace add shinyobjectz/agent-ergonomics
claude plugin install agent-ergonomics@agent-ergonomics
```

Without either, copy `skills/agent-ergonomics` into your agent's skills directory.

## Using it

Your agent uses it when a request fits. You can also name it:

- "Untangle this codebase and give me the decision log before changing anything."
- "Our CLI is used by agents. Make it agent-friendly, and measure it first."
- "Rewrite the onboarding copy so it's written for a first-time user."
- "Walk the first five minutes of this app as a new user and list every concept they meet."

It asks before two optional additions: removing comments that only restate the code, and removing
tests that wouldn't catch a real bug. It never deletes either without asking.

## Credits

The untangling method adapts caldoai's untangle-codebase. The agent-as-user process draws on StevenLi-phoenix's
aci-design-process. The list of AI tells builds on hardikpandya's stop-slop and Wikipedia's "Signs of AI writing".
See [NOTICE](NOTICE).

MIT licensed. More at [agentergonomics.org](https://agentergonomics.org).
