# Agent Ergonomics (AX) — Model (working)

Defined collaboratively via the grill-me interview. **Agent-first from first
principles** — DX is contrast/motivation, not the source. The skill is **both an
evaluator** (rate a system's AX) **and a designer** (prescribe AX improvements).

## Root facts about an average agent

Everything traces to these:
- Perceives **text + empirical queries/tests + (sometimes) images/video** —
  *querying facts (running a test, checking a source graph, real evidence) is as
  important as reading source.* Visual modalities help but are less reliable and
  only when the system gives capturable references.
- Acts only by emitting **tool calls** (CLI/functions) — nothing out-of-band.
- **Bounded context**; **pays per token**.
- Carries little **state across calls**; may be **interrupted/restarted**.
- **Stochastic / fallible** — misreads, wrong branches, imperfect input.
- **Recursive, not merely looping** — moves toward goals with memory/learnings.
- Arrives with **training priors** it conforms to or conflicts with.
- A **human runs it** — human-in-the-loop for setup/auth.

## Structure: a matrix

**Surfaces are rows; orthogonal qualities are columns.** A cell = how that
surface fares on that quality. Coherence isn't a 6th category — it's a column.

### Rows — surfaces (the agent's experience of the system)

1. **Disclosure** — how the agent is *informed/taught* (docs, examples, templates, progressive disclosure; cold- and warm-start).
2. **Interface** — the surface of *calling it correctly* (API/CLI/code design,
   naming, signatures, responses, inline guardrails). Includes **control mode** —
   how the agent's actions reach the target, along three axes:
   *directness* (read-only → proposed → declarative → relational → direct),
   *ownership* (vendored ↔ forked), *persistence* (sandboxed ↔ live). The
   decisive ergonomic is **legibility of the mode** (the agent must never be
   wrong about whether its edit hits the real thing, a copy, or a spec).
   Read-throughs: directness→Safety (blast radius), fork→Coherence/Recursion
   (drift), declarative→Coherence (DRY, if the regen loop is fast & verifiable).
3. **Loop** — *operating it turn-to-turn* (single act→observe: headless execution, environment, observation, failure).
4. **Recursion** — the *continual cross-turn experience* (progress, memory/state continuity, learning, drift, compounding, resumability, state machines, task management).
5. **Human** — where the agent and human *meet*: the full collaboration/oversight
   relationship (not just the on-ramp). Facets: **intent intake/delegation**
   (agent reliably gets the goal + constraints) · **progress & observability**
   (human sees what it's doing at the right grain) · **approval & escalation**
   (agent knows when to stop and ask vs barrel ahead/over-ask) · **steerability**
   (human can redirect mid-flight — interrupt without shattering context — the
   chaos variable) · **trust & auditability** (verify/audit what it did and why;
   attribution, accountability) · **handoff** (clean takeover both directions) ·
   **setup/auth/onboarding** (the on-ramp — one facet, still essential).

### Columns — orthogonal lenses (dragged across every row)

- **Coherence (DRY↔WET)** — aligned, non-redundant state/task/memory/code; one system, no re-implementation, no wet repetition.
- **Economy** — token/context cost of the surface.
- **Determinism** — predictable + reproducible behavior.
- **Verifiability** — empirically checkable (tests, queries, exit codes, artifacts).
- **Prior-alignment** — matches the agent's training expectations / known conventions.
- **Safety** — reversible / low blast-radius.

## The matrix — what each cell determines

| Surface ↓ / Lens → | Coherence (DRY↔WET) | Economy | Determinism | Verifiability | Prior-alignment | Safety |
|---|---|---|---|---|---|---|
| **Disclosure** | One canonical how-to; no duplicated/contradictory docs to reconcile | Right depth via progressive disclosure; doesn't blow context | Guidance specific enough to be reliable, not over-templated into copy | Runnable examples/tests/reference impls to confirm understanding *before* acting | Framed in known terms/patterns; fast to learn | Teaches the safe path first; warns on destructive ones |
| **Interface** | One way to do a thing; no re-specifying; state-keyed calls | Terse calls + queryable/progressive responses; no truncation or bloat | Same call → same effect; no hidden modes/surprises | Calls return machine-checkable results; state is queryable | Names/signatures match expectations; unique & non-confusable | Gates/flags irreversible actions inline; guardrails surfaced |
| **Loop** | One coherent per-turn execution model; no fragmented mechanisms | Cheap per-turn output; no re-parsing full dumps each call | Same action → same observable result (reproducible) | Step success confirmable via exit code / artifact / test / query | Behaves like known CLIs; non-interactive as expected | Reversible / dry-runnable / sandboxed turn actions |
| **Recursion** | State machine ↔ persisted memory stay aligned; no re-implementing or falling back | Cheap re-orientation across turns; compaction-friendly | Long trajectory stays on-path; drift corrected, not accumulated | Progress checkable against goals (done vs remaining; did the arc advance) | Workflow matches natural goal→task→stage staging agents expect | Compounds safe scaffolding; resumes without corrupting state |
| **Human** | One coherent place to delegate, observe & approve — not scattered control surfaces; the agent's model of human intent stays single-sourced (no re-asking, no conflicting instructions) | Low *human-attention* cost — escalates/reports only when it matters (no approval spam, no black box); setup is minimal | Human can predict what the agent does autonomously vs asks about — stable, legible autonomy boundaries | Human can audit/verify what the agent did and why — clear trail, attributable actions, justified trust | Delegation/approval/oversight follow patterns humans *and the harness* expect (Claude Code skills/hooks/approvals); portable across harnesses | High-stakes/irreversible actions escalate for approval; human can halt/override; secrets without holes; clear accountability |

## Measurement — a purposeful instrument toolbox (no fixed integer rubric)

We reject one universal integer scale. AX is measured with a **toolbox of
instruments**, each matched to what it measures best; a cell is filled by the
instrument(s) that best exemplify it, sometimes combined. **Which instrument
best captures a given quality is itself validated empirically** — we test the
instrument, not just the tool. Principle: *purposefully picked and instrumented
for the outcome we want to measure — never a number for its own sake.*

| # | Instrument | Output (not a 1–5) | Best for |
|---|---|---|---|
| 1 | **Empirical trial telemetry** (behavioral RCT) | success rate · turns-to-success · tokens-to-success · retry/recovery rate · time-to-first-action | real difficulty; Loop, Recursion, Economy |
| 2 | **Static / instrumented counters** | tokens/response · #interactive prompts · output variance over N runs (determinism) · duplication ratio (DRY) · #state systems · #unguarded irreversible ops | Economy, Determinism, Coherence, Safety |
| 3 | **Perplexity / cold-call accuracy** (info-theoretic) | model surprisal · cold-first-try success % (correct call, no docs) | Interface legibility, prior-alignment, naming |
| 4 | **Pairwise → Elo / Bradley–Terry** | relative ranking + uncertainty | holistic, cross-tool, when absolutes are meaningless |
| 5 | **Item Response Theory** (latent trait) | latent AX estimate + SE + per-probe difficulty | rigorous composite from heterogeneous probes |
| 6 | **Trajectory / time-series** | token-per-turn slope (compounding vs cruft) · success-over-time (drift) · regen cost | Recursion |
| 7 | **Pareto frontier** | frontier placement on success×cost×turns | combining without one number |
| 8 | **Qualitative friction coding** | taxonomy-tagged themes + counts/severity | the unquantifiable; failure-mode discovery |

**Combining → an AX profile**: a radar/vector over surfaces×lenses, each cell
from its best-fit instrument, normalized for comparability; a **Pareto
placement** (success×cost×turns); and an **optional latent IRT scalar** only when
a single number is unavoidable — the profile is primary. The **benchmark** = a
fixed battery of agent tasks run across tools, reproducibly.

## Probe battery & test agent

**Test agent — two modes:**
- **Harness-agnostic** (measuring a tool/SDK/skill/system, NOT a harness): run a
  standard baseline coding agent — the **Workbooks-native `workagent` format** —
  so harness variance washes out and we measure the *tool* (à la SWE/coding-agent
  benchmarks). **Default.**
- **Harness-specific** (the harness *is* the subject, or is the tool's target
  deployment): run against that harness's architecture specifically.

**Comparability:** task *content* is tool-specific (the tool's representative
artifact from a fixed intent); the *measurement* template is constant. **N trials
per probe** for statistics.

| Tier | Probe | Primarily measures | Instruments |
|---|---|---|---|
| **T0 Cold-call** | Produce a correct invocation **with no docs** | Interface legibility, prior-alignment, naming | perplexity, cold-first-try % |
| **T1 Guided task** | Produce the representative artifact **with docs** | Loop, Disclosure, Economy, Verifiability | success, turns, tokens, recovery |
| **T2 Multi-turn project** | A staged, evolving task over many turns | Recursion, Coherence | trajectory slopes, memory alignment |
| **T3 Failure-injection** | Seed a broken state / wrong input | Safety, failure-actionability, recovery | recovery rate, blast radius, error legibility |
| **T4 Pairwise** | Same intent on two tools | holistic cross-tool | Elo / Bradley–Terry |
| **T5 Compaction survival** | Work until context exhausts → compact → continue, **≥3 levels**; still advancing/refining the goal? | **Recursion** (the continual experience) | per-compaction goal-progress retention; trajectory |
| **T6 Refinement / autonomy ceiling** | How far *past* a first acceptable output: # completion states passed while refining; does the tool afford self-review→query→correct→improve? | **autonomy** (roll-up), Verifiability, Recursion | #refinement cycles; self-correction success |
| **(static)** | No run — inspect the system | Economy/DRY/Safety counters | instrumented counters |

## Workflow & output (locked)

**Three passes: Screen → Deep → Designer.**
- **Screen** (cheap, all tools): static counters + **T0 cold-call** + **one T1**,
  single trial. First-pass profile, flags worst cells. *This is the OOTA
  catalog application* — screen all ~134, rank, surface the agent-hostile ones.
- **Deep** (chosen tools): full **T0–T6**, **N = 5 trials/probe**, through ≥3
  compaction levels. Full profile + Pareto + optional IRT scalar.
- **Designer**: readings → prescribed AX fixes.

**Output artifact — always a `.work` literate report.** Evidence is carried as
**source blocks that reference real code at real line numbers** (the report cites
live source, not paraphrase — the evaluator is held to the same verifiability bar
it measures). It **renders**: this project **ships a `.work` → inline-markdown
renderer** as a deliverable.

## Decisions (locked)

- **Designer** emits **prioritized fixes + ready-to-apply patches** (diffs against
  the tool's source where mechanical), in the same `.work` report.
- **Evidence standard:** any **non-neutral** cell reading (hostile/good/exemplary
  — i.e. a *claim*) must anchor to a real **source block** (file:line) or a
  **probe-run log**. Neutral/absent may be assertion-only.
- **Renderer:** a **standalone `.work` → markdown/HTML renderer shipped by this
  project** (source blocks resolve to real code); keeps the project independently
  vendorable.
- **Harness docs:** fetched **only in harness-specific mode** (Claude Code etc.)
  to keep the Human/portability cells current; harness-agnostic (workagent) runs
  skip it.

## Packaging & build (locked)

- **Skill:** `agent-ergonomics` — auto-triggers on "agent ergonomics", "AX",
  "rate the agent ergonomics of X", plus explicit `/agent-ergonomics`.
- **Build order:** **Full Deep harness first** — build the whole instrument
  suite (incl. compaction T5, refinement T6, IRT, Elo) before any breadth run.
  Most complete, slowest to first result. *(Screen path falls out of it.)*
- **Report location:** in the **subject's own repo** — a report for OOTA's `d2`
  lives at `out-of-thin-air/docs/ax/d2.work`, so evidence/source-refs stay local.
- **Repo posture:** own vendored subtree at
  `github.com/shinyobjectz/agent-ergonomics`; **first target = the OOTA catalog.**

## Build backlog (Full Deep harness)

1. **`workagent` test harness** — drive the Workbooks-native standard agent for
   harness-agnostic runs; harness-specific adapters later.
2. **Probe battery** — T0–T6 + static, with the "tool-specific content / fixed
   measurement template" comparability layer; N=5.
3. **Instruments** — telemetry, counters, perplexity/cold-call, trajectory,
   Elo/Bradley–Terry, IRT, Pareto, friction-coding — each emitting normalized
   readings into the matrix.
4. **`.work` report + standalone renderer** — literate report with source-block
   evidence; `.work` → markdown/HTML renderer.
5. **Designer** — readings → prioritized fixes + patches.
6. **Run order:** Screen all of OOTA → triage → Deep the worst/most-used → Design.
