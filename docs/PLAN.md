# Agent Ergonomics — Full Build Plan (start → finish)

Build order: **Full Deep harness first** (the whole instrument suite before any
breadth run); the Screen path falls out of it. First real target: the **OOTA
catalog**. Model/rationale: [`ax-model.md`](ax-model.md).

---

## 0. Architecture & contracts

### Repo layout
```
agent-ergonomics/
  skill/agent-ergonomics/      # the skill (DONE) — SKILL.md + references
  docs/                        # ax-model.md, PLAN.md
  schemas/                     # JSON Schemas (canonical contracts)
  ax/                          # the engine
    cli/                       # `ax` CLI (Bun/TS)               — orchestration
    harness/                   # workagent trial driver (Bun/TS) — runs agents, captures telemetry
    probes/                    # T0–T6 + static probe defs + intent templates
    instruments/              # the 8 instruments (Python stats pkg + TS counters)
    report/                    # .work report builder
    renderer/                  # standalone .work → md/HTML renderer (Bun/TS)
  fixtures/                    # golden reports, sample subjects, recorded transcripts
```
Reports themselves are written into the **subject's own repo**
(`<subject>/docs/ax/<tool>.work`), not here.

### Tech stack (plan assumptions — overridable)
- **Bun/TypeScript** — `ax` CLI, harness/orchestration, static counters, `.work` renderer (matches the `oota` CLI; one runtime for the agent-facing surface).
- **Python** — the statistical instruments (IRT, Bradley–Terry/Elo, Pareto, perplexity math, trajectory regression) where the libraries are strongest; invoked as a sidecar by the CLI.
- **Workbooks `workagent`** — the standard baseline agent for harness-agnostic trials.

### Canonical contracts (Phase 0 deliverable — `schemas/`)
- `cell-reading.json` — one matrix cell: `{surface, lens, instrument, value, normalized, level?, evidence[], confidence, n}` where `evidence[]` is `{type: source|probe-log, ref, hash|runId, excerpt}`.
- `probe.json` / `probe-result.json` — a probe definition and its raw signals.
- `ax-profile.json` — the filled matrix + roll-ups (per-surface, per-lens, autonomy, Pareto coords, optional IRT scalar) + hostile-flag list.
- `report.json` — the `.work` report manifest (front-matter the renderer reads).
- `subject.json` — what's being evaluated (path, kind: tool|sdk|skill|harness, mode: agnostic|harness-specific, entrypoints).
- The 5 **surfaces** × 6 **lenses** enumerated as canonical constants consumed everywhere.

**Why first:** every later phase emits/consumes these; lock them before code.

---

## 1. `.work` report + standalone renderer

The output spine — build it early so everything has a concrete target.

- **Report `.work` spec** — literate markdown + an AX front-matter block + one
  block per non-empty cell + **`source` blocks** that reference real code at
  `file:line` (the evidence carrier). Define the minimal grammar the renderer
  supports (subset of full `.work`).
- **Source-block resolver** — `file:line(-line)` → live excerpt, with an integrity
  **hash** of the referenced lines (so a report flags when cited code has moved).
- **Renderer** (`ax/renderer/`) — `.work` → markdown and HTML; resolves source
  blocks to real code, renders the matrix/radar inline. Standalone (no nexus dep)
  so the project stays independently vendorable.
- **Golden report** — hand-author one `fixtures/golden.work` to lock the format
  and drive the renderer's tests.

**Deliverable:** `ax render <report.work>` produces md + HTML; golden round-trips.

---

## 2. Trial harness — PI baseline (micro-VM) + ACP for explicit harnesses

The harness is **pluggable** (`AgentRunner`). Three real runners (mock is
test-only and never feeds a real profile):

- **`PiRunner` (baseline, DONE + validated)** — the PI coding agent
  (`@earendil-works/pi-coding-agent`) run non-interactively:
  `pi --print --mode json --no-session --provider openrouter --model z-ai/glm-5.2`.
  Telemetry is parsed **straight from PI's JSON event stream** — real tokens
  (`usage.input/output`), cost, turns (`turn_end`), **compaction levels
  (`compaction_end`, free T5 signal)**, final answer. Runs on host or inside a
  **Docker micro-VM** (`OOTA_SANDBOX=docker`, the lightest local harness). No
  nexus. *(Validated live: cold-call + guided runs return real signals.)*
- **`AcpRunner` (explicit harnesses)** — drives a specific agent (Claude Code,
  Gemini, custom) over the **Agent Client Protocol** (JSON-RPC/stdio) inside the
  sandbox, for harness-specific mode (`OOTA_ACP_AGENT=<cmd>`). Implemented to
  spec; pending validation against a live ACP agent.
- **`WorkagentRunner` (alternate)** — shells to the Zig `work` CLI's
  `agent run` (needs a nexus). Kept as an option; the **reactor/`work` is used
  primarily for `.work` parsing/weaving**, not for running trials.

Honest default: `pickRunner` → real PI if installed, else `null` → behavioral
tiers are **skipped** (cells unmeasured), never mock-filled. The Screen/breadth
leaderboard is **static-only** (cheap, reproducible); `ax deep` runs the real PI
battery.
- **Trial runner** — `(probe, subject, agentConfig) → run` → capture **transcript
  + telemetry**: turns, input/output tokens per turn, tool calls, exit status,
  artifacts produced, wall-clock, retries. One `runId` per trial, transcript
  persisted to `fixtures/transcripts/`.
- **N-trial wrapper** — run N=5, aggregate + variance.
- **Determinism capture** — identical-input reruns → output variance metric.
- **Compaction harness (for T5)** — drive a session to context exhaustion, force
  compaction, continue; repeat **≥3 levels**; checkpoint goal-progress each level.
- **Harness adapters (later)** — pluggable Claude-Code adapter for
  harness-specific mode (+ fetch latest harness docs there).

**Deliverable:** `ax trial <probe> <subject>` runs a workagent trial, emits a `probe-result.json` + transcript.

---

## 3. Probe battery (T0–T6 + static)

- **Comparability layer** — a probe = `intent template` (constant) + `subject
  binding` (tool-specific) → tool-specific *content*, identical *measurement*.
- **T0 Cold-call** — strip docs; agent must emit a correct invocation → cold-first-try %, model logprob.
- **T1 Guided task** — produce the representative artifact with docs → success, turns, tokens, recovery.
- **T2 Multi-turn project** — staged evolving task → trajectory + coherence signals.
- **T3 Failure-injection** — seed broken state/wrong input → recovery rate, blast radius, error legibility.
- **T4 Pairwise** — same intent on two subjects → matchup outcomes for Elo.
- **T5 Compaction survival** — uses the compaction harness; per-level goal retention.
- **T6 Refinement / autonomy ceiling** — push past first acceptable output; count completion states passed; detect self-review→query→correct paths.
- **Static probes** — no run; feed the counters instrument.

**Deliverable:** each probe runs against a subject and emits raw `probe-result.json`.

---

## 4. Instruments (8) — raw signals → normalized cell readings

Each instrument consumes probe results / static analysis and writes
`cell-reading.json` into the matrix. Includes the **instrument↔cell mapping**
(which instruments fill which cells) and a **normalization** step for cross-tool
comparability.

1. **Telemetry aggregation** — rates/distributions from trial runs.
2. **Static counters** — tokens/response, #interactive-prompts, output variance,
   **duplication ratio (DRY)** (clone detection on docs+code), #distinct
   state/memory systems, #unguarded irreversible ops.
3. **Perplexity / cold-call** — model log-prob of correct usage + cold-first-try %.
4. **Elo / Bradley–Terry** (Python) — fit relative ranking from T4 matchups.
5. **Item Response Theory** (Python) — latent AX trait from pass/fail across probes; per-probe difficulty.
6. **Trajectory / time-series** (Python) — slopes across turns (token-per-turn, success-over-time, regen cost) from T2/T5.
7. **Pareto frontier** (Python) — placement on success×cost×turns.
8. **Friction coding** — LLM-assisted transcript tagging against a friction
   taxonomy → themes + counts/severity.

**Validation (the user's caveat):** for each instrument, test that it *exemplifies
what we need* — correlate its readings against ground-truth difficulty on
fixtures; prune/tune/weight instruments that don't carry signal.

**Deliverable:** `ax measure <subject>` → a populated set of `cell-reading.json`.

---

## 5. Profile assembly

- Fill the surfaces×lenses matrix from cell readings.
- Roll-ups: **per-surface**, **per-lens**, the **autonomy** roll-up (read across
  the matrix), **Pareto** coords, optional **IRT scalar**.
- **Hostile-flag list** — surfaced separately so a single agent-hostile cell is
  never averaged away.

**Deliverable:** `ax profile <subject>` → `ax-profile.json` + radar.

---

## 6. Evaluator workflow (Screen → Deep)

- `ax screen <subject>` — static + T0 + one T1 (single trial) → first-pass profile
  + flags. Cheap; the **OOTA-catalog breadth pass**.
- `ax deep <tool>` — full T0–T6, N=5, ≥3 compaction → full profile + Pareto (+ IRT).
- **Triage** — rank Screen results → choose Deep targets (worst-AX and most-used).

---

## 7. Designer

- `ax design <tool>` — readings → **prioritized fixes**, each tied to the failing
  cell + its source-block evidence; generate **ready-to-apply patches** where the
  fix is mechanical (naming, missing `--help`, interactive→flag, silent→nonzero
  exit, doc dedup). Fixes live in the same `.work` report.

---

## 8. End-to-end report

Assemble the `.work` report: filled matrix + radar + Pareto + hostile flags +
designer fixes + **source-block evidence** → write to the subject's repo
(`<subject>/docs/ax/<tool>.work`) → render to md/HTML.

**Deliverable:** `ax eval <tool>` runs profile → report in one shot.

---

## 9. Apply to OOTA (first real run)

1. **Screen all ~134 OOTA tools** → ranked AX profile + hostile-cell flags → an
   **OOTA AX leaderboard** (`out-of-thin-air/docs/ax/README.work`).
2. **Triage** → Deep the worst-AX / most-used tools.
3. **Design** fixes; feed patches back into OOTA (close the loop — OOTA gets more
   agent-ergonomic).
4. Re-Screen to show movement.

---

## 10. Self-dogfood & validation

- Run agent-ergonomics **on itself** (and on `workagent`) — the skill rates its
  own AX; fix what it flags.
- **Instrument validation** loop (ongoing): keep correlating instrument readings
  to ground-truth outcomes; retire instruments that don't exemplify the target.

---

## Dependency order (critical path)

`schemas (0)` → `renderer+report (1)` → `harness (2)` → `probes (3)` →
`instruments (4)` → `profile (5)` → `workflow (6)` → `designer (7)` →
`report e2e (8)` → `OOTA run (9)` → `dogfood (10)`.

Parallelizable: renderer (1) ∥ harness (2) once schemas (0) land; the 8
instruments (4) are independent of each other.

## Milestones

- **M1 — Format**: schemas + renderer + golden report (0–1).
- **M2 — One real trial**: harness runs a workagent T1 on one OOTA tool, telemetry captured (2 + minimal 3).
- **M3 — One full profile**: all probes + instruments + profile + report for a single tool, end-to-end (3–8).
- **M4 — OOTA Screen**: breadth pass + leaderboard across all OOTA tools (6, 9.1).
- **M5 — Deep + Design + loop-back**: Deep the worst, ship fixes into OOTA, re-screen (9.2–9.4).
- **M6 — Dogfood**: AX-rate the skill itself; validate/prune instruments (10).

## Cost controls

Trials (esp. T2/T5/T6) are expensive. Cache probe results by `(subject-hash,
probe, agent, seed)`; Screen before Deep; persist transcripts for re-analysis
without re-running; cap N at 5 unless a comparison demands more.

## Risks / open

- **`workagent` integration** — exact format/driving API TBD (study in Phase 2).
- **Perplexity access** — needs model log-probs; if unavailable, fall back to
  cold-first-try % only for that instrument.
- **Compaction control** — forcing ≥3 real compaction levels reproducibly is the
  hardest harness piece; may need harness-specific hooks even in "agnostic" mode.
- **Instrument validity** — the whole measurement rests on instruments actually
  exemplifying AX; Phase 4 validation is not optional.
- **Subject-repo writes** — writing reports into other repos (e.g. OOTA) needs the
  same separate-repo discipline (own commits in the subject's repo).
