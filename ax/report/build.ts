/**
 * Phase 8 — assemble a .work AX report from a profile + designer fixes, write it
 * into the subject's own repo (docs/ax/<id>.work), and render it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Profile } from "../core/profile.ts";
import type { Fix } from "../core/designer.ts";
import { designFixes } from "../core/designer.ts";
import { screen, deep, resolveSubject, type Subject } from "../core/workflow.ts";
import { renderReport } from "../renderer/render.ts";
import { SURFACE_LABEL, LENS_LABEL } from "../core/model.ts";

/** Where the report lives in the subject's own repo, and the source-resolution root. */
function reportTarget(s: Subject): { reportPath: string; root: string } {
  const id = s.id.replace(/[^a-z0-9._-]/gi, "_");
  if (s.id.startsWith("oota:")) {
    return { reportPath: join(s.root, "docs/ax", `${s.id.slice(5)}.work`), root: "../.." };
  }
  return { reportPath: join(s.root, "docs/ax", `${id}.work`), root: "../.." };
}

export function buildReportWork(profile: Profile, fixes: Fix[], root: string): string {
  const flags = profile.hostileFlags;
  const auto = profile.rollups.autonomy;
  const lines: string[] = [];
  lines.push("```ax");
  lines.push(JSON.stringify({ subjectId: profile.subjectId, generatedBy: "agent-ergonomics", tier: profile.tier, root }));
  lines.push("```");
  lines.push("");
  lines.push(`# AX Report — \`${profile.subjectId}\``);
  lines.push("");
  lines.push(
    `**Tier:** ${profile.tier} · **autonomy roll-up:** ${auto === null ? "n/a" : auto.toFixed(2)} · ` +
      `**agent-hostile cells:** ${flags.length}. Surfaces×lenses below; cells are instrument readings in −1…+1 (hostile is negative), not 1–5 scores.`,
  );
  lines.push("");
  lines.push("## Matrix");
  lines.push("```ax-matrix");
  lines.push(JSON.stringify({ subjectId: profile.subjectId, cells: profile.cells, hostileFlags: flags }));
  lines.push("```");
  lines.push("");

  if (fixes.length) {
    lines.push("## Prioritized AX fixes");
    for (const f of fixes) {
      lines.push(`### ${f.priority}. ${f.title}  \`${f.cell}\``);
      lines.push("");
      lines.push(f.rationale);
      if (f.patch) {
        lines.push("");
        lines.push("```diff");
        lines.push(f.patch);
        lines.push("```");
      }
      // source-block evidence (file:line refs only)
      const srcs = (f.evidence ?? []).filter((e: any) => e.type === "source" && /:\d/.test(e.ref ?? ""));
      for (const e of srcs) {
        lines.push("");
        lines.push("```source " + e.ref);
        lines.push("```");
      }
      lines.push("");
    }
  } else {
    lines.push("_No agent-hostile cells found at this tier._");
    lines.push("");
  }

  lines.push("## Roll-ups");
  lines.push("");
  lines.push("| Surface | mean | | Lens | mean |");
  lines.push("|---|---|---|---|---|");
  const ps = Object.entries(profile.rollups.perSurface);
  const pl = Object.entries(profile.rollups.perLens);
  for (let i = 0; i < Math.max(ps.length, pl.length); i++) {
    const s = ps[i], l = pl[i];
    lines.push(
      `| ${s ? SURFACE_LABEL[s[0] as keyof typeof SURFACE_LABEL] : ""} | ${s && s[1] !== null ? (s[1] as number).toFixed(2) : "·"} | | ${l ? LENS_LABEL[l[0] as keyof typeof LENS_LABEL] : ""} | ${l && l[1] !== null ? (l[1] as number).toFixed(2) : "·"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export async function evalSubject(arg: string, opts: { deep?: boolean; agentId?: string } = {}): Promise<{ reportPath: string; rendered: string; drifted: string[] }> {
  const profile = opts.deep ? await deep(arg, 5, opts.agentId) : await screen(arg, opts.agentId);
  const fixes = designFixes(profile);
  const s = resolveSubject(arg);
  const { reportPath, root } = reportTarget(s);
  const work = buildReportWork(profile, fixes, root);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, work);
  const r = await renderReport(reportPath);
  return { reportPath, rendered: r.markdown, drifted: r.drifted };
}
