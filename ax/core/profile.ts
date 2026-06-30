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
  hostileFlags: Array<{ cell: string; why: string; evidence?: any[] }>;
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

export function assembleProfile(
  subjectId: string,
  tier: "screen" | "deep",
  cells: Reading[],
  pareto?: { success?: number; cost?: number; turns?: number },
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

  return {
    subjectId,
    tier,
    cells: cellList,
    rollups: { perSurface, perLens, autonomy, pareto },
    hostileFlags,
  };
}
