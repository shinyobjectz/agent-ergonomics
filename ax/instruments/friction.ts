/**
 * Instrument 8 — qualitative friction coding. LLM-tags a trial transcript
 * against a fixed friction taxonomy → themes + severity, with the quote as
 * evidence. The unquantifiable made structured (not a score).
 */
import { llmJSON } from "../core/llm.ts";

export const TAXONOMY = [
  "setup-friction", // env/deps/auth before first useful action
  "silent-failure", // failed without a clear signal
  "interactive-block", // needed a human/TTY answer
  "ambiguous-error", // error that didn't say how to recover
  "docs-gap", // missing/insufficient guidance
  "tool-mismatch", // wrong/absent toolchain
  "irreversible-risk", // destructive action without a guard
  "context-bloat", // huge output / wasted tokens
  "drift", // lost the goal over turns
  "re-implementation", // rebuilt something that existed
] as const;

export interface FrictionEvent {
  theme: (typeof TAXONOMY)[number];
  severity: 1 | 2 | 3;
  quote: string;
}

export async function codeFriction(subjectId: string, transcript: string): Promise<FrictionEvent[]> {
  if (!transcript.trim()) return [];
  const events = await llmJSON<FrictionEvent[]>(
    `You code AGENT-ERGONOMICS friction in a coding-agent transcript. Tag each friction event with one theme from this taxonomy: ${TAXONOMY.join(", ")}. severity 1=minor,2=notable,3=blocking. Quote the exact transcript span. Only real friction — empty array if the run was clean.`,
    `Subject: ${subjectId}\n\nTranscript:\n${transcript.slice(0, 12000)}\n\nReturn a JSON array of {"theme","severity","quote"}.`,
  );
  return (Array.isArray(events) ? events : []).filter((e) => TAXONOMY.includes(e.theme as any));
}

/** theme → the matrix cell it implicates (gap 7: friction flows into cells/fixes). */
export const FRICTION_CELL: Record<string, string> = {
  "setup-friction": "disclosure.economy",
  "silent-failure": "loop.verifiability",
  "interactive-block": "loop.determinism",
  "ambiguous-error": "loop.verifiability",
  "docs-gap": "disclosure.verifiability",
  "tool-mismatch": "loop.determinism",
  "irreversible-risk": "loop.safety",
  "context-bloat": "loop.economy",
  "drift": "recursion.determinism",
  "re-implementation": "recursion.coherence",
};

/** Coded friction events → cell readings (negative, scaled by severity). */
export function frictionReadings(events: FrictionEvent[]): Array<{ surface: string; lens: string; instrument: "friction"; normalized: number; raw: any; evidence: any[]; n: number; confidence: number }> {
  const byCell = new Map<string, FrictionEvent[]>();
  for (const e of events) {
    const cell = FRICTION_CELL[e.theme];
    if (cell) (byCell.get(cell) ?? byCell.set(cell, []).get(cell)!).push(e);
  }
  return [...byCell.entries()].map(([cell, evs]) => {
    const [surface, lens] = cell.split(".");
    const sev = Math.max(...evs.map((e) => e.severity)); // worst event drives the cell
    return {
      surface, lens, instrument: "friction" as const,
      normalized: -sev / 3, // 1→-0.33, 3→-1.00
      raw: { themes: evs.map((e) => e.theme), severity: sev },
      evidence: evs.slice(0, 2).map((e) => ({ type: "probe-log", ref: e.theme, excerpt: e.quote })),
      n: evs.length, confidence: 0.7,
    };
  });
}

/** Aggregate coded events → counts + severity-weighted load per theme. */
export function frictionSummary(events: FrictionEvent[]): { byTheme: Record<string, number>; load: number } {
  const byTheme: Record<string, number> = {};
  let load = 0;
  for (const e of events) {
    byTheme[e.theme] = (byTheme[e.theme] ?? 0) + 1;
    load += e.severity;
  }
  return { byTheme, load };
}
