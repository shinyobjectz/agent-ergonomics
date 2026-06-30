/**
 * Phase 6 — evaluator workflow. Screen (cheap breadth) and Deep (full battery).
 * Static tier (counters) is fully live; behavioral tiers run via the pluggable
 * AgentRunner (real PI agent if available; behavioral tiers skipped — never
 * mocked — when no real agent is present).
 */
import { copyFileSync, existsSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { runCounters, runCountersFiles } from "../instruments/counters.ts";
import { telemetryReadings } from "../instruments/telemetry.ts";
import { PROBES, runProbe, type ProbeDef } from "../probes/probes.ts";
import { pickRunner } from "../harness/agent.ts";
import { assembleProfile, type Profile, type Reading } from "./profile.ts";
import { groundedBrief, applyBrief } from "../briefs/generate.ts";

const OOTA = "/Users/shinyobjectz/Apps/shinyobjectz/projects/out-of-thin-air";

export interface Subject {
  id: string;
  path: string; // dir or representative file
  files?: string[]; // explicit fileset (scattered OOTA tools)
  root: string;
  intent: string;
  category?: string;
  tool: string;
}

/** Resolve "oota:<cat>-<tool>" → its scattered files, or a path → a dir subject. */
export function resolveSubject(arg: string): Subject {
  if (arg.startsWith("oota:")) {
    const key = arg.slice(5); // <cat>-<tool>
    const cat = key.split("-")[0];
    const tool = key.slice(cat.length + 1);
    const files = [
      `${OOTA}/wrappers/${key}.work`,
      `${OOTA}/tools/steps/${key}.sh`,
      `${OOTA}/skill/catalog/${cat}/${tool}.md`,
    ].filter((f) => existsSync(f));
    return { id: arg, path: files[0] ?? OOTA, files, root: OOTA, category: cat, tool, intent: `Produce ${tool}'s representative artifact.` };
  }
  const p = resolve(arg);
  return { id: basename(p), path: p, root: p, tool: basename(p), intent: `Use ${basename(p)} to produce its representative artifact.` };
}

/**
 * Prepare a grounded, self-fulfilling trial subject: a real cwd with the
 * subject's docs + a REAL seed entity's material, and a brief that uses it.
 * Same category → same seed (controlled comparison) unless seedKey overrides.
 */
export function groundSubject(s: Subject, seedKey?: string): { id: string; path: string; intent: string; seedId: string } {
  const dir = docsDir(s);
  const brief = groundedBrief(s.category ?? "topic", s.tool, seedKey);
  applyBrief(dir, brief);
  return { id: s.id, path: dir, intent: brief.intent, seedId: brief.seedId };
}

async function staticReadings(s: Subject): Promise<Reading[]> {
  const c = s.files && s.files.length ? await runCountersFiles(s.files, s.root, s.id) : await runCounters(s.path);
  return c.readings as Reading[];
}

/** Prepare a real cwd holding the subject's docs (for guided tiers). */
export function docsDir(s: Subject): string {
  if (s.files && s.files.length) {
    const d = mkdtempSync(join(tmpdir(), "ax-docs-"));
    for (const f of s.files) if (existsSync(f)) copyFileSync(f, join(d, basename(f)));
    return d;
  }
  try {
    if (statSync(s.path).isDirectory()) return s.path;
  } catch {}
  return mkdtempSync(join(tmpdir(), "ax-docs-"));
}

async function behavioral(s: Subject, tiers: string[], n: number, agentId?: string): Promise<{ readings: Reading[]; pareto: any; skipped?: boolean }> {
  const runner = await pickRunner(agentId);
  if (!runner) return { readings: [], pareto: undefined, skipped: true }; // honest: no silent mock
  const subj = groundSubject(s); // grounded, self-fulfilling brief with real subject matter
  const readings: Reading[] = [];
  let success = 0, cost = 0, turns = 0, count = 0;
  for (const tier of tiers) {
    const probe = PROBES.find((p) => p.tier === tier) as ProbeDef;
    const pr = await runProbe(probe, subj, runner, n);
    readings.push(...telemetryReadings(pr));
    if (tier === "T1") {
      const rs = pr.runs;
      success = rs.filter((r) => r.success).length / rs.length;
      cost = rs.reduce((a, r) => a + r.tokensIn + r.tokensOut, 0) / rs.length;
      turns = rs.reduce((a, r) => a + r.turns, 0) / rs.length;
      count = rs.length;
    }
  }
  return { readings, pareto: count ? { success, cost: Math.round(cost), turns: +turns.toFixed(1) } : undefined };
}

/**
 * Screen: static counters always; behavioral (T0+T1) only when opted in
 * (real agent runs cost money — the breadth/leaderboard pass stays static-only
 * and therefore honest, never mock-filled).
 */
export async function screen(arg: string, opts: { behavioral?: boolean; agentId?: string } = {}): Promise<Profile> {
  if (!arg) throw new Error("usage: ax screen <subject>");
  const s = resolveSubject(arg);
  const stat = await staticReadings(s);
  const beh = opts.behavioral ? await behavioral(s, ["T0", "T1"], 1, opts.agentId) : { readings: [], pareto: undefined };
  return assembleProfile(s.id, "screen", [...stat, ...beh.readings], beh.pareto);
}

export async function deep(arg: string, n = 5, agentId?: string): Promise<Profile> {
  if (!arg) throw new Error("usage: ax deep <subject>");
  const s = resolveSubject(arg);
  const stat = await staticReadings(s);
  const beh = await behavioral(s, ["T0", "T1", "T2", "T3", "T5", "T6"], n, agentId);
  if (beh.skipped) throw new Error("deep requires a real agent — install PI (`npm i -g @earendil-works/pi-coding-agent`) or pass --agent, then retry. (Screen/static works without one.)");
  return assembleProfile(s.id, "deep", [...stat, ...beh.readings], beh.pareto);
}
