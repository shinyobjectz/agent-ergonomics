/**
 * Comparative baseline (gap 3) — a per-tool report shouldn't be an island.
 * Static-screen a tool's category peers → per-cell / per-surface medians + the
 * tool's percentile, so a reading reads as "+0.85 (cat median +0.60, top 20%)".
 */
import { readdirSync } from "node:fs";
import { screen } from "./workflow.ts";
import { cellId, SURFACES, LENSES } from "./model.ts";

const OOTA = "/Users/shinyobjectz/Apps/shinyobjectz/projects/out-of-thin-air";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
export const percentile = (value: number, peers: number[]) =>
  peers.length ? Math.round((100 * peers.filter((p) => p <= value).length) / peers.length) : null;

export interface Baseline {
  category: string;
  n: number;
  members: string[];
  medianByCell: Record<string, number | null>;
  cellPeers: Record<string, number[]>;
  medianBySurface: Record<string, number | null>;
  surfacePeers: Record<string, number[]>;
}

/** Static-screen every OOTA tool in `category` and summarize (no agent runs). */
export async function categoryBaseline(category: string): Promise<Baseline> {
  const keys = readdirSync(`${OOTA}/wrappers`)
    .filter((f) => f.endsWith(".work"))
    .map((f) => f.replace(/\.work$/, ""))
    .filter((k) => k.split("-")[0] === category);

  const cellPeers: Record<string, number[]> = {};
  const surfacePeers: Record<string, number[]> = {};
  for (const k of keys) {
    const p = await screen(`oota:${k}`); // static-only
    for (const c of p.cells) {
      const id = cellId(c.surface as any, c.lens as any);
      (cellPeers[id] ??= []).push(c.normalized);
    }
    for (const [s, v] of Object.entries(p.rollups.perSurface)) if (v !== null) (surfacePeers[s] ??= []).push(v);
  }
  const medianByCell: Record<string, number | null> = {};
  for (const s of SURFACES) for (const l of LENSES) { const id = cellId(s, l); medianByCell[id] = median(cellPeers[id] ?? []); }
  const medianBySurface: Record<string, number | null> = {};
  for (const s of SURFACES) medianBySurface[s] = median(surfacePeers[s] ?? []);

  return { category, n: keys.length, members: keys, medianByCell, cellPeers, medianBySurface, surfacePeers };
}
