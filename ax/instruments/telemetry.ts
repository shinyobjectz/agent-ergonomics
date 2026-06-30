/**
 * Instrument 1 (+ trajectory slice) — turn a ProbeResult's runs into cell readings.
 * Pure aggregation of trial telemetry; no scoring rubric — rates/slopes → [-1,1].
 */
import type { ProbeResult } from "../probes/probes.ts";
import type { Reading } from "../core/profile.ts";

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const rate2n = (r: number) => r * 2 - 1; // success rate 0..1 → -1..1
// cheaper is better; map a cost to [-1,1] with a soft sweet spot
const cost2n = (v: number, good: number, bad: number) =>
  Math.max(-1, Math.min(1, 1 - (2 * (v - good)) / (bad - good)));

function variance(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return mean(xs.map((x) => (x - m) ** 2));
}

export function telemetryReadings(pr: ProbeResult): Reading[] {
  const runs = pr.runs;
  if (!runs.length) return [];
  const successRate = mean(runs.map((r) => (r.success ? 1 : 0)));
  const tokensToSuccess = mean(runs.filter((r) => r.success).map((r) => r.tokensIn + r.tokensOut)) || mean(runs.map((r) => r.tokensIn + r.tokensOut));
  const turns = mean(runs.map((r) => r.turns));
  const out: Reading[] = [];
  const ev = [{ type: "probe-log", ref: runs[0].runId }] as any[];

  if (pr.tier === "T0") {
    // cold-call: prior-alignment / legibility proxy = cold success rate
    out.push({ surface: "interface", lens: "prior_alignment", instrument: "telemetry", normalized: rate2n(successRate), raw: { coldSuccessRate: successRate }, evidence: ev });
  }
  if (pr.tier === "T1") {
    out.push({ surface: "loop", lens: "verifiability", instrument: "telemetry", normalized: rate2n(successRate), raw: { successRate }, evidence: ev });
    out.push({ surface: "loop", lens: "economy", instrument: "telemetry", normalized: cost2n(tokensToSuccess, 800, 8000), raw: { tokensToSuccess: Math.round(tokensToSuccess) }, evidence: ev });
    out.push({ surface: "interface", lens: "verifiability", instrument: "telemetry", normalized: rate2n(mean(runs.map((r) => (r.artifacts.length ? 1 : 0)))), raw: { artifactRate: mean(runs.map((r) => (r.artifacts.length ? 1 : 0))) }, evidence: ev });
    // run-to-run determinism: low success-variance + low turn-variance → deterministic
    const det = 1 - Math.min(1, variance(runs.map((r) => (r.success ? 1 : 0))) * 4 + variance(runs.map((r) => r.turns)) / 9);
    out.push({ surface: "loop", lens: "determinism", instrument: "telemetry", normalized: rate2n(det), raw: { det: +det.toFixed(2) }, evidence: ev });
  }
  if (pr.tier === "T2" || pr.tier === "T5") {
    // trajectory: goalProgress should rise; token-per-turn slope should not balloon
    const slopes = runs.map((r) => {
      const pts = r.perTurn ?? [];
      if (pts.length < 2) return { g: 0, tok: 0 };
      const g = pts[pts.length - 1].goalProgress - pts[0].goalProgress;
      const tok = (pts[pts.length - 1].tokens - pts[0].tokens) / pts.length;
      return { g, tok };
    });
    const gAdv = mean(slopes.map((s) => s.g)); // 0..1 progress gained
    const tokGrowth = mean(slopes.map((s) => s.tok)); // per-turn token drift
    out.push({ surface: "recursion", lens: "coherence", instrument: "trajectory", normalized: rate2n(Math.max(0, gAdv)), raw: { goalAdvance: +gAdv.toFixed(2) }, evidence: ev });
    out.push({ surface: "recursion", lens: "economy", instrument: "trajectory", normalized: cost2n(tokGrowth, 0, 600), raw: { tokenPerTurnDrift: Math.round(tokGrowth) }, evidence: ev });
    if (pr.tier === "T5") {
      const maxLvl = Math.max(0, ...runs.flatMap((r) => (r.perTurn ?? []).map((p) => p.compactionLevel)));
      const survived = mean(runs.map((r) => ((r.perTurn?.at(-1)?.goalProgress ?? 0) > 0.5 ? 1 : 0)));
      out.push({ surface: "recursion", lens: "determinism", instrument: "trajectory", normalized: rate2n(survived), raw: { compactionLevels: maxLvl, survivedRate: survived }, evidence: ev });
    }
  }
  if (pr.tier === "T3") {
    out.push({ surface: "loop", lens: "safety", instrument: "telemetry", normalized: rate2n(successRate), raw: { recoveryRate: successRate }, evidence: ev });
  }
  return out;
}
