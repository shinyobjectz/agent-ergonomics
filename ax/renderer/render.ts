/**
 * Standalone .work AX-report renderer.
 * Resolves `source` blocks to real code at real lines (with integrity hash),
 * and renders `ax-matrix` blocks from an AX profile. No nexus dependency.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import {
  LENSES,
  LENS_LABEL,
  SURFACES,
  SURFACE_LABEL,
  cellId,
  type CellId,
} from "../core/model.ts";

export interface RenderResult {
  markdown: string;
  html: string;
  /** evidence integrity: refs whose cited lines no longer match the stored hash. */
  drifted: string[];
}

interface Block {
  info: string;
  body: string;
}

/** Split a .work/markdown doc into fenced blocks and prose runs, in order. */
function segment(src: string): Array<{ type: "prose"; text: string } | { type: "fence"; block: Block }> {
  const out: Array<{ type: "prose"; text: string } | { type: "fence"; block: Block }> = [];
  const lines = src.split("\n");
  let i = 0;
  let prose: string[] = [];
  const flush = () => {
    if (prose.length) out.push({ type: "prose", text: prose.join("\n") });
    prose = [];
  };
  while (i < lines.length) {
    const m = lines[i].match(/^```(.*)$/);
    if (m) {
      flush();
      const info = m[1].trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      out.push({ type: "fence", block: { info, body: body.join("\n") } });
    } else {
      prose.push(lines[i++]);
    }
  }
  flush();
  return out;
}

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function resolveSource(info: string, root: string): { md: string; drift: boolean } {
  // info: source <file>:<line|a-b> [sha=xxxx] [lang]
  const parts = info.split(/\s+/).slice(1);
  const ref = parts[0] ?? "";
  const shaWanted = (parts.find((p) => p.startsWith("sha=")) ?? "").slice(4);
  const lang = parts.find((p) => !p.includes(":") && !p.startsWith("sha=")) ?? "";
  const m = ref.match(/^(.*):(\d+)(?:-(\d+))?$/);
  if (!m) return { md: "```\n(unresolvable source ref: " + ref + ")\n```", drift: false };
  const file = m[1];
  const a = parseInt(m[2], 10);
  const b = m[3] ? parseInt(m[3], 10) : a;
  const abs = isAbsolute(file) ? file : resolve(root, file);
  let excerpt: string;
  try {
    const all = readFileSync(abs, "utf8").split("\n");
    excerpt = all.slice(a - 1, b).join("\n");
  } catch (e) {
    return { md: "```\n(could not read " + file + ")\n```", drift: false };
  }
  const got = sha(excerpt);
  const drift = !!shaWanted && shaWanted !== got;
  const status = shaWanted
    ? drift
      ? `⚠️ DRIFTED — stored ${shaWanted}, now ${got}`
      : `✓ verified (${got})`
    : `🔗 sha ${got}`;
  const md = `> **\`${ref}\`** — ${status}\n\n\`\`\`${lang}\n${excerpt}\n\`\`\``;
  return { md, drift };
}

function renderMatrix(profileJson: string): string {
  let profile: any;
  try {
    profile = JSON.parse(profileJson);
  } catch {
    return "_(ax-matrix: invalid profile JSON)_";
  }
  const byCell = new Map<CellId, any>();
  for (const c of profile.cells ?? []) byCell.set(cellId(c.surface, c.lens), c);
  const fmt = (v: any) => {
    if (!v) return " · ";
    const n = typeof v.normalized === "number" ? v.normalized : null;
    const lvl = v.level ? v.level[0].toUpperCase() : "";
    return n === null ? lvl || "?" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}${lvl ? " " + lvl[0] : ""}`;
  };
  const header = ["Surface ↓ / Lens →", ...LENSES.map((l) => LENS_LABEL[l])];
  const rows = SURFACES.map((s) => [
    `**${SURFACE_LABEL[s]}**`,
    ...LENSES.map((l) => fmt(byCell.get(cellId(s, l)))),
  ]);
  const table = [
    "| " + header.join(" | ") + " |",
    "| " + header.map(() => "---").join(" | ") + " |",
    ...rows.map((r) => "| " + r.join(" | ") + " |"),
  ].join("\n");

  // simple per-surface ASCII radar (mean of a surface's cells)
  const bar = (n: number) => {
    const k = Math.round(((n + 1) / 2) * 10);
    return "█".repeat(Math.max(0, k)).padEnd(10, "░");
  };
  const radar = SURFACES.map((s) => {
    const cells = LENSES.map((l) => byCell.get(cellId(s, l))).filter(Boolean);
    const mean = cells.length ? cells.reduce((a: number, c: any) => a + (c.normalized ?? 0), 0) / cells.length : 0;
    return `  ${SURFACE_LABEL[s].padEnd(10)} ${bar(mean)} ${mean >= 0 ? "+" : ""}${mean.toFixed(2)}`;
  }).join("\n");

  const flags = (profile.hostileFlags ?? [])
    .map((f: any) => `- 🔴 **${f.cell}** — ${f.why}`)
    .join("\n");

  return (
    table +
    "\n\n**Per-surface radar** (mean cell, −1…+1):\n```\n" +
    radar +
    "\n```" +
    (flags ? "\n\n**Agent-hostile cells:**\n" + flags : "")
  );
}

export async function renderReport(path: string): Promise<RenderResult> {
  return renderWork(readFileSync(path, "utf8"), dirname(resolve(path)));
}

/** Render a .work report from a string with an explicit default source-root. */
export function renderWork(src: string, rootDefault: string): RenderResult {
  const segs = segment(src);
  // front-matter ```ax block may set a root for source resolution
  let root = rootDefault;
  for (const seg of segs) {
    if (seg.type === "fence" && seg.block.info === "ax") {
      try {
        const fm = JSON.parse(seg.block.body);
        if (fm.root) root = isAbsolute(fm.root) ? fm.root : resolve(rootDefault, fm.root);
      } catch {}
    }
  }
  const drifted: string[] = [];
  const md: string[] = [];
  for (const seg of segs) {
    if (seg.type === "prose") {
      md.push(seg.text);
    } else {
      const { info, body } = seg.block;
      if (info === "ax") continue; // front-matter, not rendered
      if (info.startsWith("source ")) {
        const r = resolveSource(info, root);
        if (r.drift) drifted.push(info);
        md.push(r.md);
      } else if (info === "ax-matrix" || info === "ax-profile") {
        md.push(renderMatrix(body));
      } else {
        md.push("```" + info + "\n" + body + "\n```");
      }
    }
  }
  const markdown = md.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  const html = `<!doctype html><meta charset="utf-8"><title>AX report</title><body style="max-width:60rem;margin:2rem auto;font:15px/1.6 ui-sans-serif,system-ui;padding:0 1rem"><pre style="white-space:pre-wrap;font:inherit">${markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</pre></body>`;
  return { markdown, html, drifted };
}
