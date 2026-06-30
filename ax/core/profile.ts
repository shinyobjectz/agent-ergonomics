/**
 * Phase 5 — profile assembly.
 * Cell readings → AX profile: matrix fill, per-surface/per-lens roll-ups,
 * autonomy roll-up, Pareto coords, hostile-flag list (never averaged away).
 */
import { LENSES, SURFACES, cellId, type Lens, type Surface } from "./model.ts";

export interface Reading {
  surface: Surface | string;
  lens: Lens | string;
  instrument: string;
  normalized: number;
  level?: string;
  raw?: any;
  evidence?: any[];
  n?: number;
  confidence?: number;
}

export interface Provenance {
  model?: string;
  trials?: number;
  costUsd?: number;
  date?: string;
  instruments?: string[];
}

export interface Profile {
  subjectId: string;
  tier: "screen" | "deep";
  cells: Reading[];
  rollups: {
    perSurface: Record<string, number | null>;
    perLens: Record<string, number | null>;
    autonomy: number | null;
    pareto?: { success?: number; cost?: number; turns?: number };
    irtScalar?: number;
  };
  coverage: { measured: number; total: number; perSurface: Record<string, number> };
  verdict: { headline: string; strength: string; topFix: string };
  hostileFlags: Array<{ cell: string; why: string; evidence?: any[] }>;
  provenance?: Provenance;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Merge multiple readings for the same cell (different instruments) by confidence-naive mean. */
function collapse(cells: Reading[]): Map<string, Reading> {
  const byCell = new Map<string, Reading[]>();
  for (const c of cells) {
    const k = cellId(c.surface as Surface, c.lens as Lens);
    (byCell.get(k) ?? byCell.set(k, []).get(k)!).push(c);
  }
  const merged = new Map<string, Reading>();
  for (const [k, rs] of byCell) {
    if (rs.length === 1) {
      merged.set(k, rs[0]);
      continue;
    }
    const normalized = mean(rs.map((r) => r.normalized))!;
    merged.set(k, {
      surface: rs[0].surface,
      lens: rs[0].lens,
      instrument: rs.map((r) => r.instrument).join("+"),
      normalized,
      level: rs.find((r) => r.normalized === Math.min(...rs.map((x) => x.normalized)))?.level,
      evidence: rs.flatMap((r) => r.evidence ?? []),
    });
  }
  return merged;
}

const LENS_OK = (n: number | null) => n !== null;

export function assembleProfile(
  subjectId: string,
  tier: "screen" | "deep",
  cells: Reading[],
  pareto?: { success?: number; cost?: number; turns?: number },
  provenance?: Provenance,
): Profile {
  const merged = collapse(cells);
  const cellList = [...merged.values()];

  const perSurface: Record<string, number | null> = {};
  for (const s of SURFACES)
    perSurface[s] = mean(cellList.filter((c) => c.surface === s).map((c) => c.normalized));
  const perLens: Record<string, number | null> = {};
  for (const l of LENSES)
    perLens[l] = mean(cellList.filter((c) => c.lens === l).map((c) => c.normalized));

  // Autonomy roll-up: how little human-dependency / how much it sustains itself —
  // read across Loop+Recursion+Human surfaces.
  const autonomyCells = cellList.filter((c) => ["loop", "recursion", "human"].includes(c.surface as string));
  const autonomy = mean(autonomyCells.map((c) => c.normalized));

  const hostileFlags = cellList
    .filter((c) => c.normalized <= -0.5 || c.level === "hostile")
    .map((c) => ({
      cell: cellId(c.surface as Surface, c.lens as Lens),
      why:
        c.raw && typeof c.raw === "object"
          ? Object.entries(c.raw).map(([k, v]) => `${k}=${v}`).join(", ")
          : `normalized ${c.normalized.toFixed(2)}`,
      evidence: c.evidence,
    }));

  // coverage (gap 4/6): measured cells vs the full 30; per-surface fraction
  const total = SURFACES.length * LENSES.length;
  const perSurfaceCov: Record<string, number> = {};
  for (const s of SURFACES) perSurfaceCov[s] = cellList.filter((c) => c.surface === s).length / LENSES.length;

  // verdict (gap 1): rule-based, reproducible — strongest/weakest surface + #1 fix
  const sorted = [...cellList].sort((a, b) => a.normalized - b.normalized);
  const worst = sorted[0], best = sorted[sorted.length - 1];
  const surfRank = SURFACES.map((s) => ({ s, v: perSurface[s] })).filter((x) => x.v !== null).sort((a, b) => (a.v! - b.v!));
  const bestSurf = surfRank[surfRank.length - 1], worstSurf = surfRank[0];
  const verdict = {
    headline: bestSurf
      ? `Strongest surface: ${bestSurf.s} (${bestSurf.v!.toFixed(2)}); weakest measured: ${worstSurf.s} (${worstSurf.v!.toFixed(2)}). ${cellList.length}/${total} cells measured (${tier} tier).`
      : `${cellList.length}/${total} cells measured — too sparse for a verdict.`,
    strength: best ? `${cellId(best.surface as Surface, best.lens as Lens)} = ${best.normalized >= 0 ? "+" : ""}${best.normalized.toFixed(2)}${best.level ? " (" + best.level + ")" : ""}` : "—",
    topFix: hostileFlags[0]
      ? `${hostileFlags[0].cell} — ${hostileFlags[0].why}`
      : worst && worst.normalized < 0.5
        ? `${cellId(worst.surface as Surface, worst.lens as Lens)} = ${worst.normalized.toFixed(2)} (lowest measured)`
        : "no pressing fix at this tier",
  };

  return {
    subjectId,
    tier,
    cells: cellList,
    rollups: { perSurface, perLens, autonomy, pareto },
    coverage: { measured: cellList.length, total, perSurface: perSurfaceCov },
    verdict,
    hostileFlags,
    provenance,
  };
}
