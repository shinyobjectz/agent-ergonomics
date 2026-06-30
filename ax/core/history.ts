/**
 * Eval history (gap 8) — persist each profile so a report can show movement
 * (before/after) across the evaluate → fix → re-measure loop. Keeps the last
 * profile per subject under fixtures/history/<subject>.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cellId } from "./model.ts";
import type { Profile } from "./profile.ts";

const DIR = join(import.meta.dir, "../../fixtures/history");
const safe = (s: string) => s.replace(/[^a-z0-9._-]/gi, "_");

export function loadPrevious(subjectId: string): Profile | null {
  const f = join(DIR, `${safe(subjectId)}.json`);
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; }
}

export function saveProfile(profile: Profile, date: string): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, `${safe(profile.subjectId)}.json`), JSON.stringify({ ...profile, savedAt: date }, null, 2));
}

export interface Delta { cell: string; prev: number; now: number; delta: number }

/** Per-cell change vs a previous profile (only cells present in both). */
export function diffProfiles(prev: Profile | null, now: Profile): Delta[] {
  if (!prev) return [];
  const pmap = new Map(prev.cells.map((c) => [cellId(c.surface as any, c.lens as any), c.normalized]));
  const out: Delta[] = [];
  for (const c of now.cells) {
    const id = cellId(c.surface as any, c.lens as any);
    const p = pmap.get(id);
    if (p != null && Math.abs(p - c.normalized) > 0.01) out.push({ cell: id, prev: p, now: c.normalized, delta: +(c.normalized - p).toFixed(2) });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
