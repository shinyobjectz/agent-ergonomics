# Agent Ergonomics (AX)

**AX = Agent Experience.** Measure and improve how well a tool, API, SDK, skill,
or system serves an *average* agent — derived first-principles from what an agent
fundamentally is, not from translating DX.

This project is a **skill** ([`skill/agent-ergonomics/SKILL.md`](skill/agent-ergonomics/SKILL.md))
that is **both an evaluator** (system → measured AX) **and a designer** (→
prioritized fixes + patches). Full model + rationale:
[`docs/ax-model.md`](docs/ax-model.md).

## The model in one screen

- **Matrix:** 5 surfaces (**Disclosure · Interface · Loop · Recursion · Human**)
  × 6 orthogonal lenses (**Coherence (DRY↔WET) · Economy · Determinism ·
  Verifiability · Prior-alignment · Safety**). Each cell = how that surface fares
  on that quality.
- **Measurement:** a purposeful **instrument toolbox** (telemetry, counters,
  perplexity/cold-call, Elo, IRT, trajectory, Pareto, friction-coding) — *no
  fixed integer rubric*. Combines into an AX profile + Pareto (+ optional scalar).
- **Probes:** a standardized battery **T0–T6 + static** run by a baseline
  **`workagent`** (harness-agnostic) — incl. **T5 compaction-survival (≥3 levels)**
  and **T6 refinement/autonomy-ceiling**.
- **Workflow:** **Screen → Deep → Designer**.
- **Output:** a **`.work` literate report** whose evidence is **source blocks
  referencing real code at real lines**; this project ships the `.work` renderer.

## Status

**Defined** (via grill-me). Build order: **Full Deep harness first** — see the
backlog in [`docs/ax-model.md`](docs/ax-model.md#build-backlog-full-deep-harness).
**First target: the OOTA catalog.** Own vendored subtree at
`github.com/shinyobjectz/agent-ergonomics`.
