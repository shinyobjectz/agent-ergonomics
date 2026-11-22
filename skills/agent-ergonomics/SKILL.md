---
name: agent-ergonomics
description: Make a codebase, tool or product easy to work in and work with for both of its consumers, the people and the agents who use it. It untangles code so a change lands in one place, redesigns interfaces (CLIs, APIs, MCP tools, errors, output) so a reader can tell what to do and whether it worked, rewrites text so it's clear and specific with no AI slop or chat residue, and cuts the concepts a newcomer has to learn, proving each change with numbers taken before and after. Use when asked to untangle or restructure a codebase, plan a large refactor, improve agent experience (AX) or user experience (UX), make a CLI, API or MCP server agent-friendly, find out why agents misuse, loop on or ignore something, fix copy or docs that sound AI-written, generic or confusing, or simplify onboarding, naming, a first screen or a README.
---

# Agent ergonomics

Everything a reader needs should be where they are, and nothing they don't need should be.

## Two consumers of the same surfaces

Everything you build is read by people and by agents: the code, the CLI, the API, the error messages, the docs, the
copy, the screens and the names behind them. UX and AX aren't two disciplines. They're two consumers of the same
surfaces.

They read differently. People scan, take the first option that looks good enough, and read closely only when stuck.
Agents read every word literally, take a name as its meaning, and act on a misreading with confidence. But they fail
on the same things: something they need lives somewhere else, one thing has two names, a step depends on something
nobody said, a message doesn't say what to do next. Fix a surface for one and you've almost always fixed it for the
other.

Agents are the stricter reader, which makes them the better instrument. A person shrugs at a vague error and tries
again. An agent loops on it, and the transcript shows exactly where the surface failed. So use agent behaviour to
measure UX questions that would otherwise be argued about, and check every change against both readers.

## Four layers, one question each

| Layer | The question | How it goes wrong |
| --- | --- | --- |
| **Code** | Should these pieces change together? | Hidden links, needless links, surplus, special cases |
| **Interfaces:** CLIs, APIs, MCP tools, output, errors | Can the reader tell what to do, do it, and tell that it worked, from what they see alone? | The five surfaces in `references/agents.md` |
| **Words:** copy, docs, messages, descriptions, plans, commits | Is every sentence for the person or agent reading it, at the moment they read it? | Residue, tells, cruft, breakage |
| **Concepts:** names, terms, the taxonomy | Can a newcomer act after one look, meeting one new idea at a time? | Too many concepts, synonyms, terms used before they're explained |

The words are a layer like the code, not polish at the end. Generated text drifts toward the same habits (hype,
filler, tidy triplets, sentences about the conversation that produced them), and each one makes the reader guess
or stop trusting the page. Rewording for the reader is how the words get untangled, and it applies to everything an
agent reads too: a tool description, a `--help`, a skill, an error.

## Scale the work to the request

| Request | Run |
| --- | --- |
| Untangle a codebase, or plan a big refactor | Every step |
| Make a CLI, MCP server, API or skill agent-friendly | Steps 2–8, with the code limited to the surface's own code |
| "Agents keep doing X wrong" | Step 2 from transcripts, then 3, 4 and 5 on that failure only |
| Copy or docs that sound AI-written, generic or confusing | Step 6 |
| "New users don't get it", too many terms, onboarding | Step 7, then 6 on the words it changes |
| Review one change | Step 3's questions on the diff, and step 6 on any text it adds |

## 1. Ask about the optional additions

Two additions are optional. List them for the user with these exact descriptions, and do only the ones they pick:

| Addition | What it does |
| --- | --- |
| **Comments** | Remove comments that only restate the code. |
| **Tests** | Remove tests that wouldn't catch a real bug, and fix the ones that fail without one. |

Ask only when the run includes every step (the first row of the table above); other requests skip it. If the user
can't answer now, carry on and record both as open decisions in the log.

## 2. Gather evidence before opinions

Don't change anything yet. Collect what the code, the readers and the agents actually do. `references/evidence.md`
has the scripts.

- **Skeleton:** strip function bodies so the whole codebase fits in context.
- **Dependency graph:** what imports what, with fan-in, fan-out and size per module.
- **Co-change:** which files change together in git history. Pairs in different folders that keep changing together
  are hidden links. Without usable history, lean on the graph and on reading the code.
- **Special-case census:** counts of env and global reads, sleeps and retries, swallowed errors, disabled tests,
  branches on one literal value, and copies of the same helper.
- **Agent behaviour:** real transcripts, logs, bug reports and failed runs. Code each failure with the friction codes
  in `references/agents.md`. If none exist, run the system's real tasks with an agent and save the transcripts. If
  neither is possible, rely on the cold read and record agent behaviour as not measured.
- **People's behaviour:** support questions, onboarding drop-off, the words people use when they're confused. They
  usually point at the same places the agents fail.
- **Cold read:** give the weakest model that must still succeed only what a newcomer would see (the tool list, the
  `--help`, the README, the first screen's text) and ask what it is and what it would do. `references/measure.md` has
  the method.

## 3. List every problem

Write each problem with its file and line, concretely enough that someone else could find it. Start the decision
log now (`references/decision-log.md`), since compaction will lose what isn't written down.

- **Code.** Three ways to get "should these change together?" wrong (`references/untangle.md`):
  - **Hidden links:** pieces that must change together where nothing shows it. Copies of logic or values, a global
    one module sets and another reads, one feature split across folders by layer, a call order callers must know.
  - **Needless links:** pieces tied together that change for different reasons. Callers reaching into internals,
    stable code importing volatile code, a general function with a parameter only one caller understands.
  - **Surplus:** pieces with no reason of their own to change. Pass-through wrappers, configuration for things that
    never vary, dead code.
- **Interfaces.** Walk the five places a reader meets the system (`references/agents.md`): how it's taught
  (Disclosure), how it's called (Interface), what each turn shows (Loop), what survives across turns (Recursion),
  and where the agent meets the person running it (Human).
- **Words.** Mark residue (text shaped by where it was made: "now supports", "as discussed", internal names), tells
  (`references/tells.md`), cruft (words that carry nothing) and breakage (placeholders, two names for one thing,
  claims that aren't true, states nobody wrote).
- **Concepts.** Keep a ledger of every term a newcomer meets before their first success
  (`references/concept-ledger.md`): where it's first met, whether it's explained there, and what else it's called.
- **Special cases,** in every layer: an `if` for one value, a parameter for one caller, a swallowed error, a retry
  or sleep, a disabled test, a flag only the docs mention, an exception to a rule. Each is a requirement the design
  never accounted for. Read them together to work out what the system needs to be.

## 4. Redesign from first principles

Work out the fixes as if the system had known today's requirements from the start. Look for the one fix behind
several problems, which often looks nothing like them. Don't fix special cases one at a time.

Test every fix against the layer's question: pieces that change together end up together and everything depends on
what changes less; the reader can tell what to do and whether it worked; every sentence serves the reader; the
newcomer meets fewer concepts. Then check it against both consumers: a fix that helps the agent and confuses the
person, or the reverse, isn't done.

Some patterns point straight at the fix (`references/untangle.md` has more):

- **Checks that compare two lists** (docs against flags, types against the parser) mean one should be generated
  from the other.
- **A rule with many exceptions** draws its line in the wrong place.
- **Copies kept because a rule forbids the import** mean the shared piece belongs lower down.
- **Per-kind update code** means one generic path is missing.
- **Behaviour switched by environment variables** any module can read means settings should be declared once.
- **Modules split by line count** come out shallow and tangled. Split along what changes together.
- **Two names for one thing** in the product mean one concept the code also splits in two.

Write each fix above the problems it solves, in the decision log. Mark the fixes that need the user's decision,
such as anything that reverses a rule they set. Don't apply those until they answer; carry on with the rest.

## 5. Take the baseline, then fix

Before the first fix, record the numbers the fixes are meant to move: the census counts, the places a typical change
touches, the concepts before first success, and an agent eval set run against today's system
(`references/measure.md`). If agents can't be run, record the eval set as not measured rather than skipping the
rest. Without numbers, it's opinion.

Then fix everything on the list, starting with the fixes that remove the most problems:

- Remove the special cases the redesign makes unnecessary, and keep the ones the system still needs, each with its
  reason at the site.
- Prove each change keeps intended behaviour: tests pass, outputs are identical where they should be, and
  performance doesn't regress past noise. Fix bugs only where the structural change fixes them anyway.
- If the user chose **Comments**: remove comments that restate the code, even when phrased as a why. Keep comments
  about something outside the code ("the proxy drops websockets, so we poll").
- If the user chose **Tests**, do them last, since tests are the safety net. Remove tests that repeat the
  implementation or can't fail. Rewrite tests tied to internals so they depend on behaviour.

## 6. Write every surface for its reader

Every surface the work touched has words: help output, errors, tool descriptions, docs, copy, commit messages, the
skill itself. Write each one for whoever reads it, at the moment they read it. `references/writing.md` has the full
method; in short:

1. **A reader card first:** who reads it, where they arrive from, what they want, and the one thing they must leave
   with.
2. **The happy path** as numbered steps from the reader's side, before any copy, with edge cases attached to the
   step where they happen.
3. **Information in the order the reader needs it:** what this is, why it matters to them, how to do the first
   thing, what can go wrong. Lead with the answer.
4. **Plain, concrete, true.** The reader's words, a real example over an adjective, and every claim checked against
   the product.
5. **Every state written:** empty, loading, error, success, no permission. Every error says what happened and what
   to do next. No dead ends (`references/flows.md`).
6. **Cut** every sentence whose removal doesn't change what the reader knows or does.
7. **Four checks:** residue (`references/residue.md`), tells (`references/tells.md`), facts, and a cold read.

Rewrite; don't swap synonyms. A tell fixed with a thesaurus is still a tell.

## 7. Check first contact

Whether the people and agents it's for understand it after one look. `references/first-contact.md` has the method
and `references/readers.md` the research behind it. The rules:

1. Start from what the reader already knows: their words, and patterns from tools they already use.
2. One new idea at a time, introduced where it's first needed, with an example.
3. One name per thing, everywhere.
4. A term earns its place only if the reader must tell it apart from something else to act.
5. Show the next step, not every step.
6. Every entry point (a search result, a deep link, a tool call) stands on its own.
7. Fewer concepts beat better-explained ones.

Walk the reader's first few minutes (or the agent's first few calls) one screen or response at a time, collapse the
concept ledger, and test with at least two cold readers: a five-second test, a first-click test, an agent cold read
or a teach-back. Where readers and the design disagree, the design is wrong.

## 8. Check, and repeat until done

Have subagents search independently for special cases, hidden links, needless links, surplus, surfaces where a
reader can't tell what to do or whether it worked, residue and tells, and terms used before they're explained.
Rerun the census, the eval set and the cold reads. Keep going until nothing worth fixing is left.

You're done when:

- As few special cases remain as possible. The count left is the best measure of how close you are.
- A typical change lands in one place, and nothing imports anything more volatile (changed more often, by git
  history) than itself.
- The eval set shows a lift over the baseline at an acceptable cost, on the weakest model that must succeed.
- The intended people and agents can each say what it is and what to do first, after one look, and complete the
  first task without meeting a term before it's explained.
- No text fails the residue, tells or fact checks.
- Subagents find no issues worth fixing.
- Intended behaviour is the same as at the start, apart from bugs the refactor fixed.

## Lessons from measuring agents

These come from building and then discarding a full AX measurement suite:

- **Start with the cheapest measure that would change a decision.** A suite of statistical instruments built before
  the first useful result ended unused. A cold read and five real tasks usually decide more.
- **Real or skip.** Never fill a number with an estimate or a mock. Record it as not measured.
- **Unmeasured isn't zero.** Report what was covered next to every result.
- **Judges anchor to the brief.** A model grading output against its brief will praise a stub that matches the
  brief's words. Have it describe what it sees first, then grade the description.
- **Hold the task fixed when comparing.** Two tools or two versions get the same task, inputs and model.

## References

- `references/agents.md`: what an agent is, the five surfaces, the six qualities, and the friction codes.
- `references/untangle.md`: signs of hidden links, needless links, surplus and special cases, and the patterns that
  point to their fixes.
- `references/evidence.md`: scripts for the skeleton, dependency graph, co-change and census.
- `references/measure.md`: the cold read, eval sets, baselines and judging.
- `references/decision-log.md`: the log's format, with an example.
- `references/writing.md`: step 6 in full. `references/residue.md`, `references/tells.md` and `references/flows.md`
  are its checklists.
- `references/first-contact.md`: step 7 in full. `references/readers.md` covers how people and agents read;
  `references/concept-ledger.md` is the ledger's format.
