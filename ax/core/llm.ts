/**
 * OpenRouter chat helper for the LLM-driven instruments (matchup judge, friction
 * coder, artifact quality grader). Text + vision. Judge model is routed by
 * artifact modality: text → z-ai/glm-5.2, image/svg/pdf/html → a vision model,
 * video → a video model. Override via env.
 */
const TEXT_MODEL = process.env.OOTA_MODEL || "z-ai/glm-5.2";
// minimax/minimax-m3 is the multimodal judge (image + video) — verified to
// support image input on OpenRouter. Override via OOTA_JUDGE_IMAGE/VIDEO.
const IMAGE_MODEL = process.env.OOTA_JUDGE_IMAGE || "minimax/minimax-m3";
const VIDEO_MODEL = process.env.OOTA_JUDGE_VIDEO || "minimax/minimax-m3";

export type JudgeKind = "text" | "image" | "video";

export function judgeModelFor(artifactKind?: string): { model: string; kind: JudgeKind } {
  switch (artifactKind) {
    case "image": case "svg": case "pdf": case "html": case "model3d":
      return { model: IMAGE_MODEL, kind: "image" };
    case "video":
      return { model: VIDEO_MODEL, kind: "video" };
    default:
      return { model: TEXT_MODEL, kind: "text" };
  }
}

async function chat(model: string, system: string, content: any, temperature = 0): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature, messages: [{ role: "system", content: system }, { role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`openrouter ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function llmText(system: string, user: string, temperature = 0): Promise<string> {
  return chat(TEXT_MODEL, system, user, temperature);
}

export async function llmJSON<T = any>(system: string, user: string): Promise<T> {
  const raw = await llmText(system + "\n\nRespond with ONLY valid JSON, no prose, no code fences.", user);
  const m = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(m ? m[0] : raw) as T;
}

/** Vision/multimodal call — images as data URLs. Used by the artifact judge. */
export async function llmJSONVision<T = any>(model: string, system: string, user: string, imageDataUrls: string[]): Promise<T> {
  const content: any[] = [{ type: "text", text: user + "\n\nRespond with ONLY valid JSON." }];
  for (const url of imageDataUrls) content.push({ type: "image_url", image_url: { url } });
  const raw = await chat(model, system, content);
  const m = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(m ? m[0] : raw) as T;
}
