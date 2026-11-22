---
name: first-read
description: Make an app, tool, API, CLI, page or doc understood on first contact by the people and agents it's for, so they can act without over-reading, overthinking, or jumping from one new concept or coined term to the next. It models how the intended reader actually reads, walks their first path step by step, keeps a ledger of every concept and term they meet, collapses the taxonomy, and tests with cold readers. Use when designing or reviewing onboarding, a first screen, a landing page, information architecture, navigation, naming and terminology, a README or getting-started guide, an API or tool surface, or when people or agents say something is confusing, takes too long to get, or has too many concepts.
---

# First read

Understanding comes from mapping something new onto something already known. A reader who meets a product starts
with their own words, their own job and the tools they used before. Every concept that doesn't map costs them
attention, and every term they meet before it's explained breaks the chain. Too many of either and they over-read,
guess or leave.

The aim: the people and agents the product is for can say what it is, who it's for and what to do first, then do the
first task, without meeting an idea before it's needed or a word they don't have.

## How readers actually read

`references/readers.md` covers this in depth. The short version:

- **People scan.** They read headings, the first words of lines, buttons and anything that looks clickable. They
  take the first option that seems good enough, and read closely only when stuck. They hold about four new things in
  mind at once.
- **Agents read everything, literally.** They can't see intent, so a name is the meaning. They lean hard on priors
  from training, pay for every token, forget between sessions, and act on a misreading with confidence.
- **Both** follow scent: the words in front of them that predict where the thing they want is. Both come with a
  mental model borrowed from something similar, and both stall on a term they haven't met.
- **The builder is the worst judge.** Once you know what a term means you can't un-know it, so your own read always
  passes. Test with readers who don't know.

## The rules

1. **Start from what the reader already knows.** Use their words, and patterns from products they already use. A
   familiar pattern costs nothing. A novel one has to pay for itself.
2. **One new idea at a time,** introduced where it's first needed, with a concrete example. Never a glossary up
   front.
3. **One name per thing,** everywhere, and never the same name for two things. Synonyms make readers wonder whether
   there are two things.
4. **A term earns its place only if the reader must tell it apart from something else to act.** Otherwise, describe
   it in plain words. Coined words, internal names and taxonomy levels the user never acts on stay out of what they
   read.
5. **Show the next step, not every step.** Reveal options when they become relevant. Defaults handle the rest.
6. **Let use teach the model.** The first screen, first output or first response says what this is in the reader's
   words and offers one obvious action whose result shows how the thing works.
7. **Every entry point stands alone.** A reader arriving from a search result, a deep link or a tool call can tell
   where they are, what this is, and where to go next.
8. **Fewer concepts beat better-explained ones.** Removing an idea from the reader's path beats explaining it well.

## The method

### 1. Write the readers down

- **The human reader** (the ideal customer or user the product is for): their job and what triggers them to come, the tools and words they already use, what
  they're trying to get done, how much time and patience they have, and where they arrive from.
- **The agent reader:** the model tier, the harness, how much context it has left when it meets this surface, and
  what other tools compete with it.
- **The weakest reader who must still succeed:** a newcomer to the domain, a small model, someone landing on page
  three from a search. Design for them, and check the expert isn't slowed down.

### 2. Walk the first path

Step through the reader's first few minutes, or the agent's first few calls, one screen or response at a time. For
each step, write:

- what they see (only what's actually there, not what you know)
- what they think it means, given only that and what they came with
- what they do next
- what they'd need to know that they don't yet

Mark the moment they first get value. Everything before it is cost.

### 3. Keep a concept ledger

List every concept and term the reader meets, in the order they meet it. `references/concept-ledger.md` has the
format. For each: where it's first met, whether it's explained there with an example, whether it's needed at that
point, which other names it goes by, and whether the reader ever acts on it.

Then count:

- concepts met before the first success
- terms used before they're explained
- synonyms (one thing, several names) and collisions (one name, several things)
- jumps: a concept raised and then dropped, or a reader sent away to learn something before they can continue

### 4. Collapse

Change the product and its words until the counts are as low as they can go:

- Cut terms the reader never acts on, and say what they do in plain words instead.
- Merge synonyms into one name, chosen from the reader's vocabulary.
- Replace coined words with ordinary ones where an ordinary word is exact enough.
- Move every concept to the step where it's first needed, and defer the rest past the first success.
- Flatten taxonomy levels the reader doesn't navigate by. Two levels the user never distinguishes are one level.
- Reorder so no step depends on an idea a later step introduces.

Where a change touches copy, hand it to the **purpose-built** skill. Where it touches code or an agent-facing
interface, hand it to **agent-ergonomics**.

### 5. Test with cold readers

Your own read doesn't count. Run at least two of these:

- **Five-second test:** show the first screen or the top of the page for five seconds, then ask what it is, who it's
  for and what they'd do first.
- **First-click test:** give a task and see where they click first. A wrong first click usually means the scent is
  wrong.
- **Agent cold read:** give a fresh model only what a new user or agent would see (the screen text, README, tool
  list or `--help`). Ask it what this is, who it's for, what it would do first, and which words it didn't
  understand. Add two questions it can't answer from the material, which should come back unknown. The cold read in
  the agent-ergonomics skill's `measure.md` has the full method.
- **Teach-back:** after a first session, ask the reader to explain the product in their own words. Compare their
  model with the real one, term by term.

Where readers and the design disagree, the design is wrong.

### 6. Take perspectives

Before calling it done, read the product as each of these, one at a time, and write down where each one stalls:

- a new hire on day one who has never heard your terms
- someone who arrived on a deep page from a search result
- an expert in a competing product, whose priors point the wrong way
- an agent with a tenth of its context left, seeing only the tool list
- the person who will skim it in thirty seconds between meetings
- the person who will read every word because their money or data is at stake

## Done when

- The intended human and agent readers can each say what it is, who it's for and what to do first, after one look.
- They complete the first task without meeting a term before it's explained.
- The concept count before the first success is as low as the job allows, with no synonyms or collisions.
- Every entry point stands on its own.
- Cold readers' explanations match the real model.
