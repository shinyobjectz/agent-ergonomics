# Agents as users

## What an agent is

Design for these facts, not for a person at a keyboard:

- **It perceives text**, plus the results of what it runs (tests, queries, exit codes), and sometimes images. Running
  a check counts for as much as reading source.
- **It acts only through tool calls.** Anything that needs a click, a TTY prompt or a glance at a dashboard is out of
  reach.
- **Its context is bounded and every token costs.** Large output pushes out what it needed to remember.
- **It carries little across calls and sessions.** It may be interrupted, compacted or restarted midway.
- **It's stochastic.** It misreads, takes wrong branches and sends imperfect input, then acts on the misreading with
  confidence.
- **It arrives with priors from training.** Conventions it has seen a thousand times are free, and surprises are
  expensive.
- **It works toward goals across many turns**, so what it learns early should compound rather than be relearned.
- **A person runs it.** That person delegates, approves, interrupts, reads the result and pays.

## The five surfaces

Walk each one when listing problems.

1. **Disclosure: how it's taught.** Docs, examples, the skill, `--help`, the README, the first output. Good: one
   canonical way to learn each thing, at the depth needed now, with runnable examples to confirm understanding
   before acting, framed in terms the agent already knows, and the safe path taught first.
2. **Interface: how it calls.** Names, signatures, flags, schemas, the shape of responses. Good: one way to do each
   thing, names that can't be confused, the same call giving the same effect, results it can check, and destructive
   actions gated where they're made. The agent is never wrong about whether its edit reaches the real thing, a copy
   or a spec.
3. **Loop: what each turn shows it.** Output, exit codes, errors, progress. Good: runs headless with no prompts,
   output small and bounded, success confirmable from an exit code or an artifact, and errors that say what was
   wrong, show a valid example, and give the next step.
4. **Recursion: what survives across turns.** State, memory, plans, resumability, compaction. Good: progress can be
   read back from durable state (files, a status command), work resumes after compaction or restart without
   corrupting anything, and the system's own record of state never disagrees with itself.
5. **Human: where it meets the person.** Delegation, progress, approval, interruption, audit, handoff, setup. Good:
   the person sees what's happening at the right grain, the agent knows when to stop and ask, the person can redirect
   without wrecking the work, every action can be traced afterwards, and setup is short.

## Six qualities to check on every surface

- **Coherence:** one source for each fact and one way to do each thing. Nothing to reconcile.
- **Economy:** the token and attention cost is worth what it buys.
- **Determinism:** the same action gives the same result. No hidden modes.
- **Verifiability:** success and state can be checked by running something, not only by reading.
- **Prior alignment:** it matches conventions the agent already knows.
- **Safety:** actions are reversible or previewable, and their blast radius is small and visible.

## Rules for interfaces agents call

For CLIs:

- Every switch is a flag or a subcommand. Nothing waits on a TTY when stdin isn't a terminal.
- Data goes to stdout and diagnostics to stderr. Exit codes are documented, with distinct codes for distinct
  failures.
- `--json` (or another parseable form) wherever output is consumed. Ordering is deterministic, with no colour or
  spinners on stdout.
- One canonical form for each action. Re-running a command is safe, or it fails loudly when it isn't.
- Lists default to the few fields needed to decide the next step, with a flag for more.
- Long fields are truncated with their total size shown and the flag that prints the rest.
- Results include what the next step commonly needs (counts, ids, the path written), so the agent doesn't need a
  follow-up call.

For MCP tools and APIs:

- Tools are shaped around the agent's tasks, not one per backend endpoint.
- Descriptions say what the tool does, when to use it and when not, and how it differs from its siblings.
- Inputs use enums and validation before any side effect, and outputs return the handles the next call needs.
- Errors are actionable: what was wrong, a valid example, whether to retry.
- Destructive tools are annotated and confirmable. Tool output is treated as untrusted input.

For skills and instruction files:

- The description fires when it should and not otherwise. Check it with prompts that should trigger it and prompts
  that shouldn't.
- The body says what to do in order, and puts detail in references loaded only when needed.
- Every rule is one a weak model can follow from the text alone (`measure.md`, the cold read).

## Friction codes

Code each failure in a transcript with one of these, with the quote that shows it. Cluster by root cause, never by
tool or prompt.

| Code | What happened | Surface |
| --- | --- | --- |
| setup-friction | Environment, dependencies or auth stood between the agent and its first useful action | Disclosure |
| docs-gap | The guidance it needed was missing or wrong | Disclosure |
| tool-mismatch | It reached for a tool or toolchain that was wrong or absent | Interface |
| interactive-block | It needed a person or a TTY to answer | Loop |
| silent-failure | Something failed with no clear signal | Loop |
| ambiguous-error | An error didn't say how to recover | Loop |
| context-bloat | Output too large for what it carried | Loop |
| irreversible-risk | A destructive action had no guard or preview | Loop |
| drift | It lost the goal over turns | Recursion |
| re-implementation | It rebuilt something that already existed | Recursion |
| over-asking / under-asking | It stopped for approval it didn't need, or acted where it should have asked | Human |
