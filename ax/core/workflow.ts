/**
 * Phase 6 — evaluator workflow. Screen (cheap breadth) and Deep (full battery).
 * Static tier (counters) is fully live; behavioral tiers run via the pluggable
 * AgentRunner (MockAgent by default until workagent is wired).
 */
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { runCounters, runCountersFiles } from "../instruments/counters.ts";
import { telemetryReadings } from "../instruments/telemetry.ts";
import { PROBES, runProbe, type ProbeDef } from "../probes/probes.ts";
import { pickRunner } from "../harness/agent.ts";
import { assembleProfile, type Profile, type Reading } from "./profile.ts";

const OOTA = "/Users/shinyobjectz/Apps/shinyobjectz/projects/out-of-thin-air";

export interface Subject {
  id: string;
  path: string; // dir or representative file
  files?: string[]; // explicit fileset (scattered OOTA tools)
  root: string;
  intent: string;
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
    return { id: arg, path: files[0] ?? OOTA, files, root: OOTA, intent: `Produce ${tool}'s representative artifact.` };
  }
  const p = resolve(arg);
  return { id: basename(p), path: p, root: p, intent: `Use ${basename(p)} to produce its representative artifact.` };
}

async function staticReadings(s: Subject): Promise<Reading[]> {
  const c = s.files && s.files.length ? await runCountersFiles(s.files, s.root, s.id) : await runCounters(s.path);
  return c.readings as Reading[];
}

async function behavioral(s: Subject, tiers: string[], n: number, agentId?: string): Promise<{ readings: Reading[]; pareto: any }> {
  const runner = pickRunner(agentId);
  const readings: Reading[] = [];
  let success = 0, cost = 0, turns = 0, count = 0;
  for (const tier of tiers) {
    const probe = PROBES.find((p) => p.tier === tier) as ProbeDef;
    const pr = await runProbe(probe, { id: s.id, path: s.path, intent: s.intent }, runner, n);
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

export async function screen(arg: string, agentId?: string): Promise<Profile> {
  if (!arg) throw new Error("usage: ax screen <subject>");
  const s = resolveSubject(arg);
  const stat = await staticReadings(s);
  const beh = await behavioral(s, ["T0", "T1"], 1, agentId);
  return assembleProfile(s.id, "screen", [...stat, ...beh.readings], beh.pareto);
}

export async function deep(arg: string, n = 5, agentId?: string): Promise<Profile> {
  if (!arg) throw new Error("usage: ax deep <subject>");
  const s = resolveSubject(arg);
  const stat = await staticReadings(s);
  const beh = await behavioral(s, ["T0", "T1", "T2", "T3", "T5", "T6"], n, agentId);
  return assembleProfile(s.id, "deep", [...stat, ...beh.readings], beh.pareto);
}
