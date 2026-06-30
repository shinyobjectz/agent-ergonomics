/**
 * Grounded brief generation. A brief = (category/tool) × a REAL seed entity that
 * supplies the actual subject matter, so outputs are comparable + realistic.
 * Threaded from one concept (not madlibs); minimal logic, no LLM. Same category
 * → same seed by default (controlled comparison); pass a seedKey to rotate.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import seeds from "./seeds.json" with { type: "json" };

type Kind = "repo" | "dataset" | "brand" | "topic";
interface Seed { id: string; name: string; blurb: string; material: string }

/** category → compatible seed kinds (first = primary), so the pairing is sensible. */
const COMPAT: Record<string, Kind[]> = {
  diagrams: ["repo", "dataset"],
  "data-visualization": ["dataset"],
  "infographics-posters": ["dataset", "topic"],
  "maps-geo": ["dataset", "topic"],
  presentations: ["repo", "brand", "topic"],
  documents: ["topic", "repo"],
  markup: ["topic", "repo"],
  "business-documents": ["brand", "topic"],
  video: ["brand", "topic"],
  "motion-graphics": ["brand", "topic"],
  "social-formats": ["brand"],
  "advertising-creative": ["brand"],
  "graphic-design": ["brand", "topic"],
  "3d-shaders": ["topic", "repo"],
  cad: ["topic"],
  "ar-vr": ["topic", "brand"],
  music: ["topic", "brand"],
  audio: ["topic", "brand"],
  notation: ["topic"],
  games: ["topic"],
  fiction: ["topic"],
  "generative-text": ["topic"],
  creative: ["topic", "brand"],
  electronics: ["topic"],
  typography: ["brand", "topic"],
  textiles: ["brand", "topic"],
  "comics-illustration": ["topic", "brand"],
  "web-ui-prototypes": ["repo", "brand"],
};

const FILE: Record<Kind, string> = { repo: "PROJECT.md", dataset: "data.csv", brand: "BRAND.md", topic: "TOPIC.md" };
const LABEL: Record<Kind, string> = { repo: "software project", dataset: "dataset", brand: "brand", topic: "topic" };

function hashIdx(key: string, n: number): number {
  return parseInt(createHash("sha256").update(key).digest("hex").slice(0, 8), 16) % n;
}

export function pickSeed(kind: Kind, key: string): Seed {
  const pool = (seeds as any)[kind] as Seed[];
  const byId = pool.find((s) => s.id === key);
  return byId ?? pool[hashIdx(key, pool.length)];
}

export interface Brief {
  intent: string;
  files: Array<{ name: string; content: string }>;
  seedId: string;
}

/** Build a grounded brief for a tool in a category. seedKey defaults to the
 *  category (→ same seed for same-category tools = controlled comparison). */
export function groundedBrief(category: string, tool: string, seedKey?: string): Brief {
  const kinds = COMPAT[category] ?? ["topic"];
  const kind = kinds[0];
  const seed = pickSeed(kind, seedKey ?? category);
  const file = FILE[kind];
  const intent =
    `Using the \`${tool}\` tool, produce its primary artifact for the following ${LABEL[kind]}: ` +
    `**${seed.name}** — ${seed.blurb} The real material is in \`${file}\` in the working directory; ` +
    `use it as the actual content. Produce a complete, representative output (save it to the working directory).`;
  return { intent, files: [{ name: file, content: `# ${seed.name}\n\n${seed.material}\n` }], seedId: `${kind}:${seed.id}` };
}

/** Write the brief's material files into a cwd (self-fulfilling). */
export function applyBrief(cwd: string, brief: Brief): void {
  for (const f of brief.files) writeFileSync(join(cwd, f.name), f.content);
}
