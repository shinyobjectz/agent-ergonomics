---
name: purpose-built
description: Write and review anything a person or agent will read so it's built for that reader at the moment they read it, with nothing that sounds generated, nothing padded, nothing broken, and nothing that only makes sense to whoever was in the conversation that produced it. Covers product and UI copy, onboarding, error messages, empty states, docs, READMEs, landing pages, release notes, emails, scripts, plans and specs, commit messages and PR descriptions, and the flows and screen states the words sit in. Use when drafting or editing any of these, when text sounds like AI, reads generic, feels sloppy or off, refers to things the reader never saw, or when a flow has dead ends or confusing steps.
---

# Purpose-built

Every sentence is for the person who will read it, at the moment they read it. Not for the person who asked for it,
not for the conversation it came out of, and not to show the work that went into it.

Text fails that test in four ways:

- **Residue:** shaped by where it was made rather than where it's read. It mentions what changed, who asked, what
  was considered and rejected, internal names, or "the new X". The reader never saw any of that.
- **Tells:** patterns that mark text as generated. Once a reader spots one, they stop trusting the rest.
- **Cruft:** words that carry no information. Throat-clearing, the same point twice, caveats nobody needed.
- **Breakage:** placeholder text, two names for one thing, numbers that disagree, claims that aren't true, links that
  go nowhere, states the reader can reach that nobody wrote.

The same test applies beyond prose. A screen, a step in a flow, or a setting exists because the user needs it at
that point, not because it was easy to build or was left over from an earlier version.

## 1. Plan before writing

Write a reader card before any prose. It's short, and it changes everything after it.

- **Who:** the reader, in a sentence. A person in a role, an agent in a harness, or both.
- **Arriving from:** what they were doing just before, and what they already know and call things.
- **Wants:** the job they came to do.
- **Must leave with:** the one thing they need to know or do after reading. If there are three, it's three pieces.
- **Next action:** what they do right after.

For anything with steps (onboarding, a flow, a tutorial, a how-to), write the **happy path** as numbered steps from
the reader's side before writing a word of copy. Each step is something the reader does or decides, not something
the system does. Edge cases attach to the step where they happen. They don't go in an opening wall of caveats.

For plans and specs, the reader is whoever executes them. Write the decisions and their reasons, what done looks like,
and the order of work. Leave out how the discussion went.

## 2. Order the information the way the reader needs it

Outline as the reader's questions in the order they'll have them, then answer each one where it arises:

1. What is this? Say it in the reader's words.
2. Why does it matter to me?
3. How do I do the first thing?
4. What can go wrong, and how do I get back?
5. Everything else: reference, options, details.

Lead with the answer. Put conditions before the instructions they govern ("If you're on Windows, run…"). Introduce a
term at the point it's first needed, with an example. Hand concept-heavy material to the **first-read** skill.

## 3. Write

- **Plain words, the reader's words.** Use the name the reader would search for, not the internal one.
- **Concrete over abstract.** A real example, a number, the actual button label. "Exports a 1080p MP4 in about a
  minute" over "fast, high-quality exports".
- **One idea per sentence** and one point per paragraph. Vary the length so it doesn't read like a metronome.
- **True claims only.** Check every claim against the product, the code or the source before it ships. Never write
  "always", "every" or "never" unless it holds every time.
- **The reader is in the room.** Address them directly where the form allows. Say who does what.
- **Follow the project's voice** if it has a guide. Confident and punchy is fine. It never trades a fact for punch.

## 4. Flows and states

When the words sit in a product:

- **Every reachable state has its copy:** empty, loading, partial, success, error, offline, no permission. An empty
  state says what goes here and how to add the first one.
- **Every error says what happened, why if it helps, and what to do next,** in the reader's terms. "Couldn't save:
  you're offline. Your changes are kept here and will save when you reconnect." No error codes without meaning, and
  no blame.
- **No dead ends.** Every screen and every message offers the next step or the way back.
- **Labels say what happens.** A button names its action ("Save draft", "Delete 3 files"), not "OK" or "Submit".
- **Consistent names.** The thing called a "project" on one screen isn't a "workspace" on the next.
- **Nothing exists only because of history.** Remove a setting, step or screen if the user doesn't need it now, even
  if it made sense in an earlier version.

`references/flows.md` has more on happy paths, states and errors.

## 5. Cut

Go sentence by sentence and delete every one whose removal doesn't change what the reader knows or does. Then do the
same for words within sentences. Cut intros that announce what's coming and conclusions that repeat what was said.
A section that only restates its heading goes.

## 6. Check

Run all four before calling it done:

1. **Residue scan.** Read it as someone who never saw the conversation, the ticket or the previous version. Flag
   every sentence that only makes sense to an insider. `references/residue.md` lists the forms it takes and the
   words to search for.
2. **Tells scan.** Check against `references/tells.md`. Fix the pattern by rewriting the sentence, not by swapping a
   word for its synonym.
3. **Fact check.** Every claim, number, name, path and link is checked against its source, and every link resolves.
4. **Cold read.** Give the text to a fresh model with no context and ask: What is this? Who is it for? What would
   you do first? What does it assume you already know? Which sentences could go? Compare its answers to the reader
   card. Where they differ, the text is wrong, not the reader.

## Rewriting someone else's draft

Keep their facts and their voice. Fix the structure first (reader card, order), then the sentences. If the draft is a
brief or someone's notes, treat it as direction, not copy. Write fresh lines for the reader rather than polishing
the brief's phrases into place.
