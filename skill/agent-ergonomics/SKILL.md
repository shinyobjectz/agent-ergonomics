---
name: agent-ergonomics
description: Evaluate and improve the Agent Experience (AX) of a tool, API, SDK, skill, or system — how well it serves an average agent. Use when the user says "agent ergonomics", "AX", "rate the agent ergonomics of X", "how agent-friendly is this", or invokes /agent-ergonomics. Both an evaluator (measure AX → a .work report) and a designer (prescribe AX fixes + patches).
---

# Agent Ergonomics (AX)

**AX = Agent Experience.** Measure and improve how well a system serves an
*average* agent — derived first-principles from what an agent fundamentally is
(perceives text + empirical queries/tests + sometimes images; acts only via tool
calls; bounded context; pays per token; little cross-call state; stochastic;
**recursive, not looping**; arrives with training priors; a human runs it).

This skill has two modes: **evaluator** (system → AX measurement) and **designer**
(measurement → prioritized fixes + ready-to-apply patches). Full rationale:
[`../../docs/ax-model.md`](../../docs/ax-model.md).

## The model — a matrix

**Surfaces (rows) × orthogonal lenses (columns).** A cell = how that surface
fares on that quality.

**Surfaces:** **Disclosure** (how the agent is taught) · **Interface** (calling it
correctly — incl. *control mode*: directness read-only→proposed→declarative→
relational→direct × ownership vendor↔fork × persistence sandboxed↔live) ·
**Loop** (operate turn-to-turn) · **Recursion** (the continual cross-turn
experience — memory, learning, progress, drift, compounding, state-machine ↔
memory alignment) · **Human** (the full collaboration/oversight relationship:
intent intake, observability, approval/escalation, steerability, trust/audit,
handoff, setup).

**Lenses:** **Coherence (DRY↔WET)** · **Economy** · **Determinism** ·
**Verifiability** (read *and* query/test) · **Prior-alignment** · **Safety**.

(Autonomy is a roll-up read across the matrix, not a column.)

## Measurement — instrument toolbox (no fixed integer rubric)

Each cell is filled by whichever instrument(s) best capture it; validate the
*instrument*, not just the tool:

1. Empirical trial telemetry · 2. Static/instrumented counters · 3. Perplexity /
cold-call accuracy · 4. Pairwise Elo / Bradley–Terry · 5. Item Response Theory
(latent trait) · 6. Trajectory / time-series · 7. Pareto frontier · 8.
Qualitative friction coding.

Combine into an **AX profile** (radar over surfaces×lenses) + **Pareto placement**
+ optional latent **IRT scalar**. Never a number for its own sake.

## Probe battery & test agent

**Test agent:** harness-agnostic runs use the **Workbooks `workagent`** standard
agent (washes out harness variance → measures the tool). Harness-specific runs
use that harness's architecture (and fetch its latest docs).

**Comparability:** task *content* is tool-specific; the *measurement* template is
constant. **N = 5 trials/probe.**

- **T0 Cold-call** — correct invocation with no docs (legibility, prior-alignment)
- **T1 Guided task** — representative artifact with docs (Loop, Disclosure, Economy)
- **T2 Multi-turn project** (Recursion, Coherence)
- **T3 Failure-injection** (Safety, recovery, failure-actionability)
- **T4 Pairwise** (holistic Elo)
- **T5 Compaction survival** — work → exhaust context → compact → continue, **≥3 levels**; still advancing the goal? (Recursion)
- **T6 Refinement / autonomy ceiling** — how far past a first acceptable output; #completion states passed; self-review→query→correct→improve paths (autonomy, Verifiability)
- **static** — counters, no run.

## Workflow

**Screen → Deep → Designer.**
- **Screen** (all subjects): static + T0 + one T1, single trial → first-pass
  profile, flag agent-hostile cells.
- **Deep** (triaged subjects): full T0–T6, N=5, through ≥3 compaction levels →
  full profile + Pareto (+ optional IRT).
- **Designer**: readings → **prioritized fixes + ready-to-apply patches**.

## Output — a `.work` literate report

Always a **`.work`** report. **Evidence = source blocks referencing real code at
real line numbers** (cite live source, not paraphrase). **Evidence standard:**
any **non-neutral** cell reading (hostile/good/exemplary) must anchor to a source
block or a probe-run log; neutral/absent may be assertion-only. Reports are
written into the **subject's own repo** (e.g. `out-of-thin-air/docs/ax/<tool>.work`).
This project ships a standalone **`.work` → markdown/HTML renderer**.

## Scale note

Cell readings are instrument outputs, not 1–5 scores. When a qualitative level
is unavoidable, name the state — **Hostile** (actively fights the agent) /
Absent / Tolerable / Good / **Exemplary** (amplifies the agent) — and always cite
evidence per the standard above.
