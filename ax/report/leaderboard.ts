/**
 * Phase 9 — screen the whole OOTA catalog → an AX leaderboard written into the
 * OOTA repo (docs/ax/README.work). Static signals only — no agent runs, no mock.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "../core/workflow.ts";
import { SURFACES, SURFACE_LABEL } from "../core/model.ts";

const OOTA = "/Users/shinyobjectz/Apps/shinyobjectz/projects/out-of-thin-air";

function toolKeys(): string[] {
  return readdirSync(join(OOTA, "wrappers"))
    .filter((f) => f.endsWith(".work"))
    .map((f) => f.replace(/\.work$/, ""))
    .sort();
}

const meanOf = (vals: (number | null)[]) => {
  const xs = vals.filter((v): v is number => v !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
};

export async function ootaLeaderboard(): Promise<{ path: string; count: number }> {
  const keys = toolKeys();
  const rows: Array<{ id: string; overall: number | null; autonomy: number | null; hostile: number; perSurface: Record<string, number | null> }> = [];
  for (const key of keys) {
    try {
      const p = await screen(`oota:${key}`);
      rows.push({
        id: key,
        overall: meanOf(Object.values(p.rollups.perSurface)),
        autonomy: p.rollups.autonomy,
        hostile: p.hostileFlags.length,
        perSurface: p.rollups.perSurface,
      });
    } catch (e) {
      rows.push({ id: key, overall: null, autonomy: null, hostile: -1, perSurface: {} });
    }
  }
  // rank best → worst by overall (nulls last); hostile cells break ties upward
  const ranked = [...rows].sort((a, b) => {
    if (a.hostile !== b.hostile && (a.hostile > 0 || b.hostile > 0)) return b.hostile - a.hostile === 0 ? 0 : a.hostile > 0 && b.hostile > 0 ? 0 : 0;
    return (b.overall ?? -2) - (a.overall ?? -2);
  });
  const worst = [...rows].filter((r) => r.hostile > 0 || (r.overall ?? 1) < 0.3).sort((a, b) => (a.overall ?? 1) - (b.overall ?? 1));

  const fmt = (v: number | null) => (v === null ? "·" : (v >= 0 ? "+" : "") + v.toFixed(2));
  const head = ["Tool", "Overall", "Autonomy", "Hostile", ...SURFACES.map((s) => SURFACE_LABEL[s][0])];
  const table = [
    "| " + head.join(" | ") + " |",
    "| " + head.map(() => "---").join(" | ") + " |",
    ...ranked.map((r) =>
      "| `" + r.id + "` | " + fmt(r.overall) + " | " + fmt(r.autonomy) + " | " + (r.hostile < 0 ? "err" : r.hostile) + " | " +
      SURFACES.map((s) => fmt(r.perSurface[s] ?? null)).join(" | ") + " |",
    ),
  ].join("\n");

  const out: string[] = [];
  out.push("```ax");
  out.push(JSON.stringify({ subjectId: "oota:catalog", generatedBy: "agent-ergonomics", tier: "screen", root: "../.." }));
  out.push("```");
  out.push("");
  out.push("# OOTA — Agent Ergonomics (AX) Leaderboard");
  out.push("");
  out.push(`Screen-tier AX across **${keys.length}** OOTA tools — **static signals only** ` +
    `(instrumented counters: economy, DRY/coherence, determinism, safety). No agent runs, so these numbers are cheap and reproducible.`);
  out.push("Cells are instrument readings in −1…+1 (hostile is negative), not 1–5 scores. " +
    "Behavioral surfaces (Loop/Recursion/Human verifiability, cost, drift) and the Human surface are **unmeasured here** — " +
    "run `ax deep oota:<tool>` (real PI agent, z-ai/glm-5.2) for the full battery + a per-tool report.");
  out.push("");
  if (worst.length) {
    out.push("## Most agent-hostile / weakest");
    out.push("");
    out.push(worst.slice(0, 15).map((r) => `- \`${r.id}\` — overall ${fmt(r.overall)}, ${r.hostile} hostile cell(s)`).join("\n"));
    out.push("");
  }
  out.push("## Full ranking (best → worst)");
  out.push("");
  out.push("Columns: D=Disclosure I=Interface L=Loop R=Recursion H=Human.");
  out.push("");
  out.push(table);
  out.push("");

  const path = join(OOTA, "docs/ax/README.work");
  mkdirSync(join(OOTA, "docs/ax"), { recursive: true });
  writeFileSync(path, out.join("\n"));
  return { path, count: keys.length };
}
