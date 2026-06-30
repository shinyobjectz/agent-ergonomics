/**
 * Artifact quality judge (#1) — grade what the agent actually PRODUCED, not its
 * self-report. Finds the artifact, renders it to a raster when needed, and routes
 * to a modality-aware model: vision for image/svg/pdf, video model for video,
 * text for source. Falls back to source-text judging (honestly labelled) when no
 * local renderer is available.
 */
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { judgeModelFor, llmJSON, llmJSONVision } from "../core/llm.ts";

const KIND_EXT: Record<string, string> = {
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image",
  ".svg": "svg", ".pdf": "pdf", ".html": "html", ".htm": "html",
  ".mp4": "video", ".mov": "video", ".webm": "video",
  ".wav": "audio", ".mp3": "audio",
  ".d2": "text", ".mmd": "text", ".tex": "text", ".typ": "text", ".py": "text", ".js": "text", ".ts": "text", ".md": "text", ".txt": "text",
};
const SEED_FILES = new Set(["PROJECT.md", "BRAND.md", "data.csv", "TOPIC.md"]);

interface JudgeVote { model: string; score: number; valid: boolean; notes: string; seen: string }

const READER_SYS = "You are a careful, literal image reader.";
const READER_USER = 'Describe EXACTLY what is in this image — every shape, text string, and the overall layout. Report ONLY what is visibly present; do not assume or infer intent. Return {"seen":"..."}.';
const GRADE_SYS = "You grade an artifact against a brief from a LITERAL description of what it actually contains. Be strict: a stub, blank, placeholder (e.g. just 'TODO'), generic, or wrong-content artifact scores LOW regardless of what the brief wanted. Only reward content that genuinely fulfils the brief.";
const gradeUser = (brief: string, seen: string) =>
  `Brief:\n${brief}\n\nWhat the artifact ACTUALLY contains:\n${seen}\n\nScore 0..1 = how well the ACTUAL content fulfils the brief (correctness, fidelity, completeness). Return {"score":0..1,"valid":true|false,"notes":"one sentence"}.`;

/** One judge: SEE the artifact (describe), then grade its own perception. */
async function judgeOne(model: string, url: string, brief: string): Promise<JudgeVote> {
  const desc = await llmJSONVision<{ seen: string }>(model, READER_SYS, READER_USER, [url]);
  const r = await llmJSONVision<any>(model, GRADE_SYS, gradeUser(brief, desc.seen), []); // text-only grade by the same model
  return { model, score: clamp(r.score), valid: !!r.valid, notes: r.notes ?? "", seen: desc.seen };
}
const which = (b: string) => spawnSync("which", [b], { encoding: "utf8" }).status === 0;

export interface ArtifactJudgment {
  score: number; // 0..1 — median of the judge panel (robust to one outlier)
  valid: boolean;
  notes: string;
  judged: "vision-panel" | "text" | "text-fallback" | "none";
  model: string;
  artifact?: string;
  artifactKind?: string;
  seen?: string; // literal description of what the artifact actually contained
  panel?: Array<{ model: string; score: number }>; // per-judge scores
  agreement?: number; // 1 − spread (1 = unanimous)
  outliers?: string[]; // judges that disagreed with the median
  confidence?: number; // derived from agreement
}

/** The multimodal judge panel (verified image-capable on OpenRouter). Override via OOTA_JUDGE_PANEL. */
const PANEL = (process.env.OOTA_JUDGE_PANEL || "google/gemini-3.5-flash,xiaomi/mimo-v2.5,minimax/minimax-m3")
  .split(",").map((s) => s.trim()).filter(Boolean);

function walk(dir: string, depth = 2, acc: string[] = []): string[] {
  let es: string[]; try { es = readdirSync(dir); } catch { return acc; }
  for (const e of es) {
    if (e === "node_modules" || e === ".git") continue;
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory() && depth > 0) walk(p, depth - 1, acc);
    else if (st.isFile()) acc.push(p);
  }
  return acc;
}

/** Newest produced file of a known kind (excluding the seed material we placed). */
function findArtifact(cwd: string, placed: Set<string>): { path: string; kind: string } | null {
  let best: { path: string; kind: string; mt: number } | null = null;
  for (const f of walk(cwd)) {
    const base = basename(f);
    if (SEED_FILES.has(base) || placed.has(base)) continue;
    const kind = KIND_EXT[extname(f).toLowerCase()];
    if (!kind) continue;
    const mt = statSync(f).mtimeMs;
    if (!best || mt > best.mt) best = { path: f, kind, mt };
  }
  return best ? { path: best.path, kind: best.kind } : null;
}

function rasterize(path: string, kind: string): string | null {
  if (kind === "image") return path;
  const out = join(mkdtempSync(join(tmpdir(), "ax-png-")), "a.png");
  if (kind === "svg") {
    if (which("rsvg-convert") && spawnSync("rsvg-convert", ["-o", out, path]).status === 0) return out;
    if (which("magick") && spawnSync("magick", [path, out]).status === 0) return out;
    if (which("convert") && spawnSync("convert", [path, out]).status === 0) return out;
  }
  if (kind === "pdf") {
    if (which("pdftoppm") && spawnSync("pdftoppm", ["-png", "-singlefile", path, out.replace(/\.png$/, "")]).status === 0) return out;
    if (which("magick") && spawnSync("magick", [`${path}[0]`, out]).status === 0) return out;
  }
  return null;
}

const dataUrl = (png: string) => "data:image/png;base64," + readFileSync(png).toString("base64");

export async function judgeArtifact(brief: string, cwd: string, placed: Set<string>): Promise<ArtifactJudgment> {
  const art = findArtifact(cwd, placed);
  if (!art) return { score: 0, valid: false, notes: "no artifact produced in the working directory", judged: "none", model: "-" };
  const { kind: judgeKind } = judgeModelFor(art.kind);

  // vision panel: each model perceives + grades INDEPENDENTLY → median (robust)
  if (judgeKind === "image") {
    const png = rasterize(art.path, art.kind);
    if (png) {
      const url = dataUrl(png);
      const panel = (await Promise.all(PANEL.map((m) => judgeOne(m, url, brief).catch(() => null)))).filter(Boolean) as JudgeVote[];
      if (panel.length) {
        const scores = panel.map((p) => p.score).sort((a, b) => a - b);
        const median = scores[Math.floor(scores.length / 2)];
        const spread = scores[scores.length - 1] - scores[0];
        const outliers = panel.filter((p) => Math.abs(p.score - median) > 0.3).map((p) => p.model);
        return {
          score: median,
          valid: panel.filter((p) => p.valid).length >= panel.length / 2,
          notes: (panel.find((p) => p.score === median) ?? panel[0]).notes,
          judged: "vision-panel", model: PANEL.join("+"), artifact: art.path, artifactKind: art.kind,
          seen: (panel.find((p) => p.score === median) ?? panel[0]).seen,
          panel: panel.map((p) => ({ model: p.model, score: p.score })),
          agreement: +(1 - spread).toFixed(2),
          outliers,
          confidence: Math.max(0.4, +(0.9 - spread * 0.6).toFixed(2)),
        };
      }
    }
  }

  // fallback: read the source as the "seen" content, grade it with the text model
  let body = "";
  try { body = readFileSync(art.path, "utf8").slice(0, 8000); } catch {}
  const seen = body ? `Source of the ${art.kind} artifact:\n${body}` : `(binary ${art.kind}; no local renderer — only its presence is known)`;
  const r = await llmJSON<any>(GRADE_SYS, gradeUser(brief, seen));
  return { score: clamp(r.score), valid: !!r.valid, notes: r.notes ?? "", judged: body ? "text-fallback" : "text", model: "z-ai/glm-5.2", artifact: art.path, artifactKind: art.kind, seen: body.slice(0, 400), confidence: 0.55 };
}

const clamp = (n: any) => Math.max(0, Math.min(1, typeof n === "number" ? n : parseFloat(n) || 0));
