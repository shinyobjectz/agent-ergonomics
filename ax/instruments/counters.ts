/**
 * Instrument 2 — static / instrumented counters.
 * Pure static analysis of a subject path (no agent run). Emits cell readings for
 * the Economy / Coherence(DRY) / Determinism / Safety lenses across surfaces.
 * Real, cheap, runs across the whole OOTA catalog in the Screen pass.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { LEVEL_VALUE, type CellId, type Level } from "../core/model.ts";

const TEXT_EXT = new Set([
  ".md", ".work", ".sh", ".ts", ".js", ".tsx", ".jsx", ".py", ".json", ".txt", ".rs", ".go",
]);
const SKIP_DIR = new Set(["node_modules", ".git", "out", "build", "dist", ".venv-tts", "_models"]);

export interface CounterReading {
  surface: string;
  lens: string;
  instrument: "counters";
  raw: any;
  normalized: number; // -1..1
  level: Level;
  evidence: Array<{ type: "source"; ref: string; excerpt?: string }>;
  n: number; // observations behind the reading
  confidence: number; // 0..1 — static heuristics are mid; direct counts are high
}

export interface CountersResult {
  path: string;
  files: number;
  metrics: Record<string, number>;
  readings: CounterReading[];
}

function walk(root: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (SKIP_DIR.has(e)) continue;
    const p = join(root, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, acc);
    else if (TEXT_EXT.has(extname(p))) acc.push(p);
  }
  return acc;
}

const approxTokens = (s: string) => Math.ceil(s.length / 4); // ~4 chars/token

function level(n: number): Level {
  if (n <= -0.5) return "hostile";
  if (n < 0.2) return "absent";
  if (n < 0.5) return "tolerable";
  if (n < 0.8) return "good";
  return "exemplary";
}
const reading = (
  surface: string,
  lens: string,
  normalized: number,
  raw: any,
  evidence: CounterReading["evidence"] = [],
  confidence = 0.6, // static heuristic by default; direct counts pass higher
): CounterReading => ({ surface, lens, instrument: "counters", raw, normalized, level: level(normalized), evidence, n: 1, confidence });

/** Duplication ratio: fraction of normalized non-trivial lines that repeat (WET proxy). */
function duplicationRatio(texts: string[]): { ratio: number; sample: string[] } {
  const counts = new Map<string, number>();
  let total = 0;
  for (const t of texts) {
    for (const raw of t.split("\n")) {
      const line = raw.trim();
      if (line.length < 12) continue; // ignore trivial lines
      total++;
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  let dup = 0;
  const sample: string[] = [];
  for (const [line, c] of counts) {
    if (c > 1) {
      dup += c - 1;
      if (sample.length < 3) sample.push(`${c}× ${line.slice(0, 60)}`);
    }
  }
  return { ratio: total ? dup / total : 0, sample };
}

export async function runCounters(path: string): Promise<CountersResult> {
  return analyze(walk(path), path, path);
}

/** Score an explicit set of files (e.g. a single OOTA tool's wrapper+step+dossier). */
export async function runCountersFiles(files: string[], root: string, label: string): Promise<CountersResult> {
  return analyze(files, root, label);
}

async function analyze(files: string[], root: string, _label: string): Promise<CountersResult> {
  const rel = (p: string) => relative(root, p);
  let docTokens = 0;
  let codeTokens = 0;
  const docTexts: string[] = [];
  const shTexts: { file: string; text: string }[] = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const ext = extname(f);
    if (ext === ".md" || ext === ".work") {
      docTokens += approxTokens(text);
      docTexts.push(text);
    } else {
      codeTokens += approxTokens(text);
    }
    if (ext === ".sh") shTexts.push({ file: rel(f), text });
  }

  // ── signals ──
  const dup = duplicationRatio([...docTexts, ...shTexts.map((s) => s.text)]);

  // interactive-prompt risk in shell steps (read -p / prompts) → Loop hostile
  const interactiveHits: string[] = [];
  for (const s of shTexts) {
    s.text.split("\n").forEach((ln, i) => {
      if (/\bread\s+-[a-z]*p\b|\bread\s+-p\b|\bselect\s+\w+\s+in\b/.test(ln))
        interactiveHits.push(`${s.file}:${i + 1}`);
    });
  }

  // unguarded irreversible ops (rm -rf / force push / drop) not behind a flag/echo
  const irreversibleHits: string[] = [];
  for (const s of shTexts) {
    s.text.split("\n").forEach((ln, i) => {
      if (/\brm\s+-rf\b|\bgit\s+push\s+--force\b|\bDROP\s+TABLE\b|\bgit\s+reset\s+--hard\b/.test(ln) && !/echo|hint|#/.test(ln))
        irreversibleHits.push(`${s.file}:${i + 1}`);
    });
  }

  // doc presence (disclosure) — has a README/SKILL/wrapper doc?
  const hasDoc = files.some((f) => /readme|skill|\.work$/i.test(rel(f)));

  const metrics = {
    files: files.length,
    docTokens,
    codeTokens,
    duplicationRatio: +dup.ratio.toFixed(3),
    interactivePrompts: interactiveHits.length,
    irreversibleOps: irreversibleHits.length,
  };

  // ── readings (normalized −1..1) ──
  const readings: CounterReading[] = [];

  // Disclosure × Economy: doc size sweet-spot (~300–4000 tok ideal; huge = blows context)
  const docFit = docTokens === 0 ? 0 : docTokens > 12000 ? -0.3 : docTokens > 6000 ? 0.3 : 0.85;
  readings.push(reading("disclosure", "economy", docFit, { docTokens }));

  // Interface/Recursion/Human × Coherence (DRY): high duplication → WET → negative
  const dryScore = 1 - Math.min(1, dup.ratio * 6); // ratio 0→1, 0.17+→0
  const dryEv = dup.sample.map((s) => ({ type: "source" as const, ref: "(duplicated)", excerpt: s }));
  readings.push(reading("interface", "coherence", dryScore * 2 - 1, { duplicationRatio: dup.ratio }, dryEv));
  readings.push(reading("recursion", "coherence", dryScore * 2 - 1, { duplicationRatio: dup.ratio }, dryEv));

  // Loop × Determinism: interactive prompts make runs non-deterministic / blocking → hostile
  const detScore = interactiveHits.length ? -1 : 0.7;
  readings.push(
    reading("loop", "determinism", detScore, { interactivePrompts: interactiveHits.length },
      interactiveHits.slice(0, 3).map((r) => ({ type: "source" as const, ref: r })), 0.85),
  );

  // Loop × Safety: unguarded irreversible ops → hostile
  const safeScore = irreversibleHits.length ? -1 : 0.6;
  readings.push(
    reading("loop", "safety", safeScore, { irreversibleOps: irreversibleHits.length },
      irreversibleHits.slice(0, 3).map((r) => ({ type: "source" as const, ref: r })), 0.85),
  );

  // Disclosure × Verifiability (cheap proxy): presence of any doc to learn from
  readings.push(reading("disclosure", "verifiability", hasDoc ? 0.5 : -0.3, { hasDoc }));

  return { path: _label, files: files.length, metrics, readings };
}
