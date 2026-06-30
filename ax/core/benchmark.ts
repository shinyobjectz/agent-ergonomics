/**
 * Cross-tool benchmark — runs real PI tiers across a set of subjects, persists
 * the raw probe results + transcripts, then fits the cross-tool instruments
 * (Pareto, Elo/Bradley–Terry, IRT, friction-coding) on that REAL data and writes
 * a .work benchmark report.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { judgeArtifact } from "../instruments/judge.ts";
import { PiRunner } from "../harness/pi.ts";
import { DRIVERS, weightFor, weightedMean } from "../harness/drivers.ts";
import { PROBES, runProbe, type ProbeDef, type ProbeResult } from "../probes/probes.ts";
import { resolveSubject, groundSubject } from "./workflow.ts";
import { pareto, type ParetoPoint } from "../instruments/pareto.ts";
import { bradleyTerry, judgeMatchup, type Matchup } from "../instruments/elo.ts";
import { rasch } from "../instruments/irt.ts";
import { codeFriction, frictionSummary } from "../instruments/friction.ts";

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const safe = (s: string) => s.replace(/[^a-z0-9._-]/gi, "_");
const passRate = (pr: ProbeResult) => pr.runs.filter((r) => r.success).length / pr.runs.length;

function t1Summary(pr: ProbeResult | undefined): { success: number; cost: number; turns: number; answer: string } {
  if (!pr) return { success: 0, cost: 0, turns: 0, answer: "" };
  const rs = pr.runs;
  return {
    success: passRate(pr),
    cost: Math.round(mean(rs.map((r) => r.tokensIn + r.tokensOut))),
    turns: +mean(rs.map((r) => r.turns)).toFixed(1),
    answer: (rs[0]?.extra?.transcript as string) ?? "",
  };
}

export interface BenchOpts { tiers?: string[]; n?: number; agentId?: string; out?: string }

export async function benchmark(subjectArgs: string[], opts: BenchOpts = {}) {
  const tiers = opts.tiers ?? ["T0", "T1", "T3"];
  const n = opts.n ?? 1;
  if (!PiRunner.available()) throw new Error("benchmark needs PI — install @earendil-works/pi-coding-agent.");
  const driverList = opts.agentId ? [{ model: opts.agentId, modalities: ["text"] }] : DRIVERS;

  const runDir = opts.out ?? join(import.meta.dir, "../../fixtures/bench", `${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  type DriverResult = { model: string; quality: number; seen: string; byTier: Record<string, { success: number; cost: number; turns: number; transcript: string }> };
  const data: Array<{ id: string; quality: number; seen: string; cost: number; turns: number; byTier: Record<string, number>; transcript: string; artifactKind: string; drivers: DriverResult[] }> = [];

  for (const arg of subjectArgs) {
    const s = resolveSubject(arg);
    const placed = new Set((s.files ?? []).map((f) => basename(f)));
    const drivers: DriverResult[] = [];
    let artifactKind = "";
    // each driver works in its OWN fresh cwd (no artifact collision) and is judged
    for (const drv of driverList) {
      const runner = new PiRunner(drv.model);
      const subj = groundSubject(s);
      const byTier: DriverResult["byTier"] = {};
      let quality = 0, seen = "";
      for (const tier of tiers) {
        const probe = PROBES.find((p) => p.tier === tier) as ProbeDef;
        const pr = await runProbe(probe, subj, runner, n);
        const rs = pr.runs;
        byTier[tier] = {
          success: rs.filter((r) => r.success).length / rs.length,
          cost: rs.reduce((a, r) => a + r.tokensIn + r.tokensOut, 0) / rs.length,
          turns: rs.reduce((a, r) => a + r.turns, 0) / rs.length,
          transcript: (rs[0]?.extra?.transcript as string) ?? "",
        };
        if (tier === "T1") {
          try { const jj = await judgeArtifact(subj.intent, subj.path, placed); quality = jj.score; seen = jj.seen ?? jj.notes; artifactKind = jj.artifactKind ?? artifactKind; } catch {}
        }
      }
      drivers.push({ model: drv.model, quality, seen, byTier });
    }
    // combine weighted by modality — the self-checker for this output kind weighs more
    const w = (m: string) => weightFor(m, artifactKind);
    const cQuality = +weightedMean(drivers.map((d) => ({ v: d.quality, w: w(d.model) }))).toFixed(3);
    const byTierC: Record<string, number> = {};
    for (const t of tiers) byTierC[t] = weightedMean(drivers.map((d) => ({ v: d.byTier[t].success, w: w(d.model) })));
    const cCost = Math.round(weightedMean(drivers.map((d) => ({ v: d.byTier["T1"].cost, w: w(d.model) }))));
    const cTurns = +weightedMean(drivers.map((d) => ({ v: d.byTier["T1"].turns, w: w(d.model) }))).toFixed(1);
    const top = drivers.slice().sort((a, b) => b.quality - a.quality)[0];
    data.push({ id: s.id, quality: cQuality, seen: top.seen, cost: cCost, turns: cTurns, byTier: byTierC, transcript: top.byTier["T1"]?.transcript ?? "", artifactKind, drivers });
    writeFileSync(join(runDir, `${safe(s.id)}.json`), JSON.stringify({ quality: cQuality, cost: cCost, turns: cTurns, artifactKind, drivers: drivers.map((d) => ({ model: d.model, quality: d.quality, weight: w(d.model), byTier: d.byTier })) }, null, 2));
  }

  const ids = data.map((d) => d.id);

  // ── IRT: graded — T1 passes only on a real high-quality artifact (binary was saturated) ──
  const R = data.map((d) => tiers.map((t) => (t === "T1" ? (d.quality >= 0.6 ? 1 : 0) : d.byTier[t] >= 0.5 ? 1 : 0)));
  const irtRes = rasch(ids, tiers, R);

  // ── Pareto: combined (ensemble) artifact quality × cost × turns ──
  const points: ParetoPoint[] = data.map((d) => ({ id: d.id, success: d.quality, cost: d.cost, turns: d.turns }));
  const par = pareto(points);

  // ── Elo: pairwise judge on what was ACTUALLY produced ──
  const summaries = data.map((d) => ({ id: d.id, summary: `quality=${d.quality.toFixed(2)}, cost=${d.cost} tok, turns=${d.turns}; produced: ${(d.seen || "").slice(0, 500)}` }));
  const matchups: Matchup[] = [];
  for (let i = 0; i < summaries.length; i++)
    for (let j = i + 1; j < summaries.length; j++) {
      try { matchups.push(await judgeMatchup(summaries[i], summaries[j])); } catch { /* skip a failed judgment */ }
    }
  const elo = matchups.length ? bradleyTerry(ids, matchups) : {};

  // ── Friction: code the top driver's T1 transcript ──
  const friction: Record<string, any> = {};
  for (const d of data) {
    try { friction[d.id] = frictionSummary(await codeFriction(d.id, d.transcript)); } catch { friction[d.id] = { byTheme: {}, load: 0 }; }
  }

  const quality = Object.fromEntries(data.map((d) => [d.id, { score: d.quality, seen: d.seen, artifactKind: d.artifactKind, drivers: d.drivers.map((x) => ({ model: x.model, quality: x.quality, weight: weightFor(x.model, d.artifactKind) })) }]));
  const result = { subjects: ids, tiers, n, drivers: driverList.map((d) => d.model), points, pareto: par, elo, irt: irtRes, matchups, friction, quality, runDir };
  writeFileSync(join(runDir, "benchmark.json"), JSON.stringify(result, null, 2));
  writeFileSync(join(runDir, "benchmark.work"), renderBench(result));
  return result;
}

function renderBench(r: any): string {
  const L: string[] = [];
  L.push("```ax");
  L.push(JSON.stringify({ subjectId: "benchmark", generatedBy: "agent-ergonomics", tier: "deep" }));
  L.push("```");
  L.push(`\n# Cross-tool AX benchmark\n\nSubjects: ${r.subjects.join(", ")} · tiers ${r.tiers.join("/")} · N=${r.n}. Real PI runs; artifacts vision-judged.\n`);
  L.push(`## Artifact quality (driver ensemble, vision-judged 0–1)\n\nDrivers: ${(r.drivers ?? []).join(", ")} · combined = modality-weighted.\n`);
  L.push(Object.entries(r.quality ?? {}).sort((a: any, b: any) => b[1].score - a[1].score).map(([k, v]: any) =>
    `- ${k}: **${v.score.toFixed(2)}** [${(v.drivers ?? []).map((d: any) => `${d.model.split("/").pop()} ${d.quality.toFixed(2)}${d.weight > 1 ? "✓" : ""}`).join(", ")}] — ${(v.seen || "").slice(0, 70)}`).join("\n") || "_n/a_");
  L.push("\n## Elo (Bradley–Terry, pairwise judge)\n");
  L.push(Object.entries(r.elo).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]) => `- ${k}: **${v}**`).join("\n") || "_no matchups_");
  L.push("\n## IRT latent AX ability (θ)\n");
  L.push(Object.entries(r.irt.ability).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]) => `- ${k}: θ=${v}`).join("\n"));
  L.push("\n## Probe difficulty (β)\n");
  L.push(Object.entries(r.irt.difficulty).map(([k, v]) => `- ${k}: β=${v}`).join("\n"));
  L.push("\n## Pareto frontier (success × cost × turns)\n");
  L.push(r.pareto.map((p: any) => `- ${p.id}: ${p.onFrontier ? "**on frontier**" : "dominated by " + p.dominatedBy.join(", ")}`).join("\n"));
  L.push("\n## Friction (coded from transcripts)\n");
  L.push(Object.entries(r.friction).map(([k, v]: any) => `- ${k}: load ${v.load} — ${Object.keys(v.byTheme).join(", ") || "clean"}`).join("\n"));
  L.push("");
  return L.join("\n");
}
