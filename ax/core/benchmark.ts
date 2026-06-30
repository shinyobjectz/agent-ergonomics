/**
 * Cross-tool benchmark — runs real PI tiers across a set of subjects, persists
 * the raw probe results + transcripts, then fits the cross-tool instruments
 * (Pareto, Elo/Bradley–Terry, IRT, friction-coding) on that REAL data and writes
 * a .work benchmark report.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { judgeArtifact } from "../instruments/judge.ts";
import { pickRunner } from "../harness/agent.ts";
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
  const runner = await pickRunner(opts.agentId);
  if (!runner) throw new Error("benchmark needs a real agent — install PI or pass --agent.");

  const runDir = opts.out ?? join(import.meta.dir, "../../fixtures/bench", `${Date.now()}`);
  mkdirSync(runDir, { recursive: true });

  const data: Array<{ id: string; prs: Record<string, ProbeResult>; quality: number; seen: string }> = [];
  for (const arg of subjectArgs) {
    const s = resolveSubject(arg);
    const subj = groundSubject(s); // grounded brief + real subject matter in cwd
    const placed = new Set((s.files ?? []).map((f) => basename(f)));
    const prs: Record<string, ProbeResult> = {};
    let quality = 0, seen = "";
    for (const tier of tiers) {
      const probe = PROBES.find((p) => p.tier === tier) as ProbeDef;
      prs[tier] = await runProbe(probe, subj, runner, n);
      // grade the actual artifact right after T1 (before later tiers touch the cwd)
      if (tier === "T1") {
        try { const j = await judgeArtifact(subj.intent, subj.path, placed); quality = j.score; seen = j.seen ?? j.notes; } catch {}
      }
    }
    data.push({ id: s.id, prs, quality, seen });
    writeFileSync(join(runDir, `${safe(s.id)}.json`), JSON.stringify({ ...prs, _quality: quality, _seen: seen }, null, 2));
  }

  const ids = data.map((d) => d.id);

  // ── IRT: graded — T1 item passes only on a real, high-quality artifact (gap: binary saturated) ──
  const R = data.map((d) => tiers.map((t) => (t === "T1" ? (d.quality >= 0.6 ? 1 : 0) : passRate(d.prs[t]) >= 0.5 ? 1 : 0)));
  const irtRes = rasch(ids, tiers, R);

  // ── Pareto: graded success (artifact quality) × cost × turns ──
  const points: ParetoPoint[] = data.map((d) => {
    const s = t1Summary(d.prs["T1"]);
    return { id: d.id, success: d.quality, cost: s.cost, turns: s.turns };
  });
  const par = pareto(points);

  // ── Elo: pairwise judge on what was ACTUALLY produced (quality + literal content) ──
  const summaries = data.map((d) => {
    const s = t1Summary(d.prs["T1"]);
    return { id: d.id, summary: `artifact quality=${d.quality.toFixed(2)}, cost=${s.cost} tok, turns=${s.turns}; produced: ${(d.seen || s.answer).slice(0, 500)}` };
  });
  const matchups: Matchup[] = [];
  for (let i = 0; i < summaries.length; i++)
    for (let j = i + 1; j < summaries.length; j++) {
      try { matchups.push(await judgeMatchup(summaries[i], summaries[j])); } catch (e) { /* skip a failed judgment */ }
    }
  const elo = matchups.length ? bradleyTerry(ids, matchups) : {};

  // ── Friction: code each subject's T1 transcript ──
  const friction: Record<string, any> = {};
  for (const d of data) {
    const tr = (d.prs["T1"]?.runs[0]?.extra?.transcript as string) ?? "";
    try { friction[d.id] = frictionSummary(await codeFriction(d.id, tr)); } catch { friction[d.id] = { byTheme: {}, load: 0 }; }
  }

  const quality = Object.fromEntries(data.map((d) => [d.id, { score: d.quality, seen: d.seen }]));
  const result = { subjects: ids, tiers, n, points, pareto: par, elo, irt: irtRes, matchups, friction, quality, runDir };
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
  L.push("## Artifact quality (vision-judged, 0–1)\n");
  L.push(Object.entries(r.quality ?? {}).sort((a: any, b: any) => b[1].score - a[1].score).map(([k, v]: any) => `- ${k}: **${v.score.toFixed(2)}** — ${(v.seen || "").slice(0, 90)}`).join("\n") || "_n/a_");
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
