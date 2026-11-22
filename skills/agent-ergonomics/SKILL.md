---
name: agent-ergonomics
description: Make a codebase, tool or product easy for agents and people to work in and work with. It untangles code so a typical change lands in one place, redesigns the surfaces agents act through (CLIs, MCP tools, APIs, skills, docs, errors) so they can tell what to do and whether it worked, and proves both with numbers taken before and after. Use when asked to untangle, restructure or clean up a codebase, to improve agent experience (AX) or agent ergonomics, to make a tool or CLI agent-friendly, to find out why agents misuse, loop on or ignore something, or to plan a large refactor. Also use when a change keeps touching many places, or when agents keep breaking things without noticing.
---

# Agent ergonomics

Everything a reader needs should be where they are, and nothing they don't need should be. The reader might be an
agent changing the code, an agent calling the tool, or a person using the product. When something they need lives
somewhere else (a copy in another file, a global set by another module, a convention nobody wrote down, a term
defined three pages later), they guess. Agents guess confidently, so they break things without noticing.

This skill applies that idea to two things at once:

- **The code**, where the question is: *should these pieces change together?* Pieces that must change together
  belong together, pieces that don't shouldn't be tied, and everything depends on what changes less.
- **The surfaces agents act through**, where the question is: *can the agent tell what to do, do it, and tell that
  it worked, from what it sees alone?* The agent has nothing but names, descriptions, schemas, output and errors.

Two companion skills cover the text and the concepts: **purpose-built** for copy, flows and plans, and
**first-read** for whether an app or tool is understood on first contact. This skill hands off to them in step 6.

## Scale the work to the request

| Request | Run |
| --- | --- |
| Untangle a codebase, or plan a big refactor | Every step |
| Make a CLI, MCP server, API or skill agent-friendly | Steps 2–7, with the code steps limited to the surface's own code |
| "Agents keep doing X wrong" | Step 2 from transcripts, then 3, 4, 5 on that failure only |
| Review one change | Step 3's questions on the diff, and step 6 on any text it adds |

## 1. Ask about the optional additions

Besides the untangling and the surfaces, two additions are optional. List them for the user with these exact
descriptions, and do only the ones they pick:

| Addition | What it does |
| --- | --- |
| **Comments** | Remove comments that only restate the code. |
| **Tests** | Remove tests that wouldn't catch a real bug, and fix the ones that fail without one. |

If the user can't answer now, carry on with the analysis and record both as open decisions in the log.

## 2. Gather evidence before opinions

Don't change anything yet. Collect what the code and the agents actually do. `references/evidence.md` has the
scripts.

- **Skeleton:** strip function bodies so the whole codebase fits in context.
- **Dependency graph:** what imports what, with fan-in, fan-out and size per module.
- **Co-change:** which files and modules change together in git history. Pairs in different folders that keep
  changing together are hidden links. Without usable history, skip this and lean on the graph and on reading the
  code.
- **Special-case census:** counts of env and global reads, sleeps and retries, swallowed errors, disabled tests,
  branches on one literal value, and copies of the same helper.
- **Agent behaviour:** real transcripts of agents using the system, logs, bug reports and failed runs. Code each
  failure with the friction codes in `references/agents.md`. If none exist, run the system's real tasks with an agent
  and save the transcripts. If neither is possible, rely on the cold read and record agent behaviour as not
  measured.
- **Cold read:** give the weakest model that must still succeed only what an agent would see (the tool list, the
  `--help`, the skill, the README) and ask it what it would do. `references/measure.md` has the method.

## 3. List every problem

Write each problem with its file and line, concretely enough that someone else could find it. Start the decision
log now (`references/decision-log.md`), since compaction will lose what isn't written down.

**In the code**, there are only three ways to get "should these change together?" wrong. `references/untangle.md`
has the full list of signs:

- **Hidden links:** pieces that must change together where nothing shows it. Copies of logic or values, modules that
  read a global another module sets, one feature split across folders by layer, a call order callers just have to
  know.
- **Needless links:** pieces tied together that change for different reasons. Callers that reach into internals,
  stable code that imports volatile code, a general function with a parameter only one caller understands, a
  shallow module whose interface changes whenever its internals do.
- **Surplus:** pieces with no reason of their own to change. Pass-through wrappers, configuration for things that
  never vary, dead code.

**On the surfaces**, walk the five places an agent meets the system, from `references/agents.md`: how it's taught
(Disclosure), how it calls (Interface), what each turn shows it (Loop), what survives across turns and compaction
(Recursion), and where it meets the person running it (Human).

**Special cases** go on the list too: an `if` for one value, a parameter for one caller, a swallowed error, a retry
or sleep, a disabled test, an exception to a rule. Each is a requirement the design never accounted for. Read them
together to work out what the system needs to be.

## 4. Redesign from first principles

Work out the fixes as if the system had known today's requirements from the start. Look for the one fix behind
several problems, which often looks nothing like them. Don't fix special cases one at a time.

Test every fix with the same question, even one that looks better in the code: pieces that change together end up
together, pieces that don't aren't tied, and everything depends on what changes less. For surfaces, add: the agent
can now tell what to do and whether it worked, from what it sees.

Some patterns point straight at the fix. `references/untangle.md` has more.

- **Checks that compare two lists** (docs against flags, types against the parser) mean one list should be generated
  from the other.
- **A rule with many exceptions** draws its line in the wrong place. The exceptions are often a layer nobody named.
- **Copies kept because a rule forbids the import** mean the shared piece belongs lower down.
- **Per-kind update code** ("this field follows the frame, that one doesn't") means one generic path is missing.
- **Behaviour switched by environment variables** that any module can read means settings should be declared once
  and passed in.
- **Modules split by line count** rather than by reason to change come out shallow and tangled. Split along what
  changes together.

Write each fix above the problems it solves, in the decision log. Mark the fixes that need the user's decision,
such as anything that reverses a rule they set. Don't apply those until they answer; carry on with the rest.

## 5. Take the baseline, then fix

Before the first fix, record the numbers the fixes are meant to move: the census counts, the places a typical change
touches, and an agent eval set run against today's system (`references/measure.md`). Afterwards they show whether
the work helped. Without them, it's opinion.

Then fix everything on the list, starting with the fixes that remove the most problems:

- Remove the special cases the redesign makes unnecessary, and keep the ones the system still needs, each with its
  reason at the site.
- Prove each change keeps intended behaviour: the tests pass, outputs are identical where they should be, and
  performance doesn't regress past noise. Fix bugs only where the structural change fixes them anyway.
- If the user chose **Comments**: remove comments that restate the code, even when phrased as a why. Keep comments
  about something outside the code ("the proxy drops websockets, so we poll"). A comment explaining a workaround goes
  when the redesign removes the problem behind it.
- If the user chose **Tests**, do them last, since tests are the safety net. A test that wouldn't catch a real bug
  is one that repeats the implementation or can't fail: remove it. A test that fails without a bug is usually tied
  to internals: rewrite it to depend on behaviour.

## 6. Hand the words and concepts to the companion skills

Every surface the work touched has text: help output, error messages, tool descriptions, docs, commit messages, the
skill itself. Run **purpose-built** over that text, so it's written for the reader at the moment they read it and
nothing in it depends on the conversation that produced it. Run **first-read** over the concepts, so an agent or a
person meets one new idea at a time and the same thing always has the same name.

## 7. Check, and repeat until done

Have subagents search independently for special cases, hidden links, needless links, surplus, and surfaces where an
agent can't tell what to do or whether it worked. Rerun the census and the eval set. Keep going until nothing worth
fixing is left.

You're done when:

- As few special cases remain as possible. The count left is the best measure of how close you are.
- A typical change lands in one place.
- Every import is reasonable, and nothing imports anything more volatile (changed more often, by git history)
  than itself.
- The eval set shows a lift over the baseline at an acceptable cost, on the weakest model that must succeed.
- Subagents find no issues worth fixing.
- Intended behaviour is the same as at the start, apart from bugs the refactor fixed. Test this at the end.

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
- `references/untangle.md`: the signs of hidden links, needless links, surplus and special cases, and the patterns
  that point to their fixes.
- `references/evidence.md`: scripts for the skeleton, dependency graph, co-change and census.
- `references/measure.md`: the cold read, eval sets, baselines and judging.
- `references/decision-log.md`: the log's format, with an example.
