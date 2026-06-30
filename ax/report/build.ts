/**
 * Phase 8 — assemble a rich .work AX report. Addresses the 10 report gaps:
 * verdict, evidence-on-every-cell, comparative baseline, coverage,
 * confidence/N, unmeasured≠zero, friction-in-cells, deltas, cell glosses,
 * provenance. Writes into the subject's own repo and renders.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Profile, Reading } from "../core/profile.ts";
import type { Fix } from "../core/designer.ts";
import { designFixes } from "../core/designer.ts";
import { screen, deep, resolveSubject, type Subject } from "../core/workflow.ts";
import { renderReport } from "../renderer/render.ts";
import { SURFACES, LENSES, SURFACE_LABEL, LENS_LABEL, cellId, type Surface, type Lens } from "../core/model.ts";
import { categoryBaseline, percentile, type Baseline } from "../core/baseline.ts";
import { loadPrevious, saveProfile, diffProfiles, type Delta } from "../core/history.ts";

const LENS_GLOSS: Record<string, string> = {
  coherence: "DRY↔WET — aligned, non-redundant state/task/code; no re-implementation.",
  economy: "token / context cost of this surface.",
  determinism: "predictable + reproducible behaviour.",
  verifiability: "empirically checkable — tests, queries, exit codes, artifacts.",
  prior_alignment: "matches the agent's training expectations / known conventions.",
  safety: "reversible / low blast-radius.",
};
const SURFACE_GLOSS: Record<string, string> = {
  disclosure: "how the agent is taught to do it.",
  interface: "calling it correctly (signatures, naming, control mode).",
  loop: "operating it turn-to-turn (act → observe).",
  recursion: "the continual cross-turn experience (memory, drift, compounding).",
  human: "the human↔agent collaboration (intent, oversight, steering).",
};

function reportTarget(s: Subject): { reportPath: string; root: string } {
  const id = s.id.replace(/[^a-z0-9._-]/gi, "_");
  if (s.id.startsWith("oota:")) return { reportPath: join(s.root, "docs/ax", `${s.id.slice(5)}.work`), root: "../.." };
  return { reportPath: join(s.root, "docs/ax", `${id}.work`), root: "../.." };
}

const fmt = (v: number | null | undefined) => (v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2));

export function buildReportWork(profile: Profile, fixes: Fix[], root: string, opts: { baseline?: Baseline; deltas?: Delta[] } = {}): string {
  const { baseline, deltas } = opts;
  const byCell = new Map(profile.cells.map((c) => [cellId(c.surface as Surface, c.lens as Lens), c]));
  const deltaByCell = new Map((deltas ?? []).map((d) => [d.cell, d.delta]));
  const L: string[] = [];

  L.push("```ax");
  L.push(JSON.stringify({ subjectId: profile.subjectId, generatedBy: "agent-ergonomics", tier: profile.tier, root }));
  L.push("```");
  L.push("");
  L.push(`# AX Report — \`${profile.subjectId}\``);
  L.push("");
  // ── 1. Verdict ──
  L.push(`> **Verdict.** ${profile.verdict.headline}`);
  L.push(`> **Top strength:** ${profile.verdict.strength}. **#1 fix:** ${profile.verdict.topFix}.`);
  L.push("");
  // ── 10. Provenance / 4. Coverage ──
  const p = profile.provenance ?? {};
  L.push(
    `**Coverage:** ${profile.coverage.measured}/${profile.coverage.total} cells measured · ` +
      `**Provenance:** ${p.instruments?.join("+") ?? "—"}${p.model ? `, agent=${p.model}` : ""}` +
      `${p.trials ? `, ${p.trials} trials` : ""}${p.costUsd ? `, $${p.costUsd.toFixed(4)}` : ""}${p.date ? `, ${p.date}` : ""}.`,
  );
  L.push("");

  // ── 5/6. Matrix (unmeasured = —, distinct from 0) ──
  L.push("## Matrix");
  const head = "| Surface ↓ / Lens → | " + LENSES.map((l) => LENS_LABEL[l]).join(" | ") + " |";
  L.push(head);
  L.push("| " + ["---", ...LENSES.map(() => "---")].join(" | ") + " |");
  for (const s of SURFACES) {
    const cov = profile.coverage.perSurface[s] ?? 0;
    const row = LENSES.map((l) => {
      const c = byCell.get(cellId(s, l));
      return c ? fmt(c.normalized) : "—";
    });
    L.push(`| **${SURFACE_LABEL[s]}** (${Math.round(cov * LENSES.length)}/${LENSES.length}) | ${row.join(" | ")} |`);
  }
  L.push("");

  // ── 3/5/8. Cell detail: value · N · confidence · vs category median · delta ──
  L.push("## Cell detail");
  L.push("| Cell | reading | level | N | conf | cat median (pctile) | Δ vs last |");
  L.push("|---|---|---|---|---|---|---|");
  for (const c of [...byCell.values()].sort((a, b) => a.normalized - b.normalized)) {
    const id = cellId(c.surface as Surface, c.lens as Lens);
    const med = baseline?.medianByCell[id];
    const pct = baseline ? percentile(c.normalized, baseline.cellPeers[id] ?? []) : null;
    const d = deltaByCell.get(id);
    L.push(
      `| \`${id}\` | ${fmt(c.normalized)} | ${c.level ?? "—"} | ${c.n ?? "—"} | ${c.confidence != null ? c.confidence.toFixed(2) : "—"} | ` +
        `${med != null ? `${fmt(med)} (${pct ?? "—"}%)` : "—"} | ${d != null ? (d >= 0 ? "▲+" : "▼") + d.toFixed(2) : "—"} |`,
    );
  }
  L.push("");

  // ── 2. Evidence on every measured cell ──
  L.push("## Evidence");
  let any = false;
  for (const c of byCell.values()) {
    const ev = (c.evidence ?? []).filter((e: any) => e.ref);
    if (!ev.length) continue;
    any = true;
    L.push(`**\`${cellId(c.surface as Surface, c.lens as Lens)}\`** (${c.instrument})`);
    for (const e of ev) {
      if (e.type === "source" && /:\d/.test(e.ref)) {
        L.push("```source " + e.ref);
        L.push("```");
      } else {
        L.push(`- \`${e.ref}\`${e.excerpt ? ` — ${e.excerpt}` : ""}`);
      }
    }
    L.push("");
  }
  if (!any) L.push("_No anchored evidence at this tier (static proxies only)._\n");

  // ── 8/9. Hostile + fixes ──
  if (profile.hostileFlags.length) {
    L.push("## Agent-hostile cells");
    for (const f of profile.hostileFlags) L.push(`- 🔴 **${f.cell}** — ${f.why}`);
    L.push("");
  }
  if (fixes.length) {
    L.push("## Prioritized fixes");
    for (const f of fixes) {
      L.push(`### ${f.priority}. ${f.title}  \`${f.cell}\``);
      L.push("");
      L.push(f.rationale);
      if (f.patch) { L.push(""); L.push("```diff"); L.push(f.patch); L.push("```"); }
      L.push("");
    }
  }

  // ── 4. Coverage by surface ──
  L.push("## Coverage by surface");
  for (const s of SURFACES) {
    const n = Math.round((profile.coverage.perSurface[s] ?? 0) * LENSES.length);
    L.push(`- **${SURFACE_LABEL[s]}** — ${n}/${LENSES.length} lenses measured${n === 0 ? " (unmeasured)" : ""} · ${SURFACE_GLOSS[s]}`);
  }
  L.push("");

  // ── 9. Glossary ──
  L.push("## What the lenses mean");
  for (const l of LENSES) L.push(`- **${LENS_LABEL[l]}** — ${LENS_GLOSS[l]}`);
  L.push("");

  // ── 10. Provenance footer ──
  L.push("---");
  L.push(
    `_Generated by the agent-ergonomics skill (${profile.tier} tier). ` +
      `Readings are instrument outputs in −1…+1 (hostile is negative), not 1–5 scores; "—" = unmeasured (≠ 0). ` +
      `${baseline ? `Baseline = ${baseline.n} ${baseline.category} peers. ` : ""}` +
      `${p.model ? `Agent ${p.model}, ${p.trials} trials, $${(p.costUsd ?? 0).toFixed(4)}. ` : ""}_`,
  );
  L.push("");
  return L.join("\n");
}

export async function evalSubject(arg: string, opts: { deep?: boolean; agentId?: string } = {}): Promise<{ reportPath: string; rendered: string; drifted: string[] }> {
  const profile = opts.deep ? await deep(arg, 5, opts.agentId) : await screen(arg, { behavioral: opts.deep, agentId: opts.agentId });
  const fixes = designFixes(profile);
  const s = resolveSubject(arg);
  const { reportPath, root } = reportTarget(s);
  // gap 3: comparative baseline; gap 8: deltas vs the last eval
  const baseline = s.category ? await categoryBaseline(s.category).catch(() => undefined) : undefined;
  const deltas = diffProfiles(loadPrevious(profile.subjectId), profile);
  const work = buildReportWork(profile, fixes, root, { baseline, deltas });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, work);
  saveProfile(profile, profile.provenance?.date ?? new Date().toISOString().slice(0, 10));
  const r = await renderReport(reportPath);
  return { reportPath, rendered: r.markdown, drifted: r.drifted };
}
