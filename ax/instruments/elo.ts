/**
 * Instrument 4 — pairwise → Bradley–Terry ratings (Elo scale).
 * `judgeMatchup` runs the T4 comparison via an LLM judge; `bradleyTerry` fits
 * relative strengths from the matchups (MM algorithm), scaled to ~Elo.
 */
import { llmJSON } from "../core/llm.ts";

export interface Matchup {
  a: string;
  b: string;
  winner: string; // a | b | "tie"
}

/** MM (minorization-maximization) fit of Bradley–Terry strengths → Elo-scaled ratings. */
export function bradleyTerry(items: string[], matchups: Matchup[]): Record<string, number> {
  const idx = new Map(items.map((it, i) => [it, i]));
  const n = items.length;
  const wins = new Array(n).fill(0); // total wins (ties = 0.5 each)
  const games: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const m of matchups) {
    const i = idx.get(m.a)!, j = idx.get(m.b)!;
    if (i == null || j == null) continue;
    games[i][j]++; games[j][i]++;
    if (m.winner === m.a) wins[i] += 1;
    else if (m.winner === m.b) wins[j] += 1;
    else { wins[i] += 0.5; wins[j] += 0.5; }
  }
  let p = new Array(n).fill(1);
  for (let iter = 0; iter < 200; iter++) {
    const next = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let denom = 0;
      for (let j = 0; j < n; j++) if (j !== i && games[i][j] > 0) denom += games[i][j] / (p[i] + p[j]);
      next[i] = denom > 0 ? (wins[i] + 0.5) / denom : p[i]; // +0.5 smoothing
    }
    const geo = Math.exp(next.reduce((a, v) => a + Math.log(v), 0) / n);
    p = next.map((v) => v / geo); // normalize (geometric mean 1)
  }
  // strengths → Elo: 400*log10(p) + 1500
  const out: Record<string, number> = {};
  items.forEach((it, i) => (out[it] = Math.round(400 * Math.log10(p[i]) + 1500)));
  return out;
}

export async function judgeMatchup(a: { id: string; summary: string }, b: { id: string; summary: string }): Promise<Matchup> {
  const r = await llmJSON<{ winner: "a" | "b" | "tie"; why: string }>(
    "You judge AGENT ERGONOMICS: given two tools' outcomes on the same task, which was easier/cheaper/more reliable for an AVERAGE coding agent? Consider success, token cost, turns, error clarity. Be decisive; 'tie' only if truly equal.",
    `Tool A (${a.id}): ${a.summary}\n\nTool B (${b.id}): ${b.summary}\n\nReturn {"winner":"a"|"b"|"tie","why":"..."}`,
  );
  return { a: a.id, b: b.id, winner: r.winner === "a" ? a.id : r.winner === "b" ? b.id : "tie" };
}
