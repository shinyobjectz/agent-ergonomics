/**
 * Instrument 7 — Pareto frontier. Combine multi-objective outcomes without a
 * single score: maximize success, minimize cost (tokens) + turns. Marks the
 * non-dominated (efficient) subjects. Pure computation; no LLM.
 */
export interface ParetoPoint {
  id: string;
  success: number; // 0..1, higher better
  cost: number; // tokens, lower better
  turns: number; // lower better
}
export interface ParetoResult {
  id: string;
  onFrontier: boolean;
  dominatedBy: string[];
}

/** a dominates b: ≥ on success, ≤ on cost & turns, and strictly better in one. */
function dominates(a: ParetoPoint, b: ParetoPoint): boolean {
  const ge = a.success >= b.success && a.cost <= b.cost && a.turns <= b.turns;
  const strict = a.success > b.success || a.cost < b.cost || a.turns < b.turns;
  return ge && strict;
}

export function pareto(points: ParetoPoint[]): ParetoResult[] {
  return points.map((p) => {
    const dominatedBy = points.filter((q) => q.id !== p.id && dominates(q, p)).map((q) => q.id);
    return { id: p.id, onFrontier: dominatedBy.length === 0, dominatedBy };
  });
}
