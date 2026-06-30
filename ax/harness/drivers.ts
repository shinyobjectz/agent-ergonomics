/**
 * Driver ensemble — the agents that DO the work. Run all; combine weighted by
 * the tool's output modality. A driver that can perceive that modality (check
 * its own work) is weighted up; text-only drivers still run so we see their
 * blind attempts.
 *
 * - glm-5.2          text
 * - qwen3.7-plus     text
 * - kimi-k2.7-code   text + image  (the image self-checker)
 * - gemini-3.5-flash text + image + audio + video  (fully multimodal — kept for
 *                    audio/video tools, where it can actually listen/watch)
 */
export interface Driver { model: string; modalities: string[] }

export const DRIVERS: Driver[] = process.env.OOTA_DRIVERS
  ? process.env.OOTA_DRIVERS.split(",").map((m) => ({ model: m.trim(), modalities: ["text"] }))
  : [
      { model: "z-ai/glm-5.2", modalities: ["text"] },
      { model: "qwen/qwen3.7-plus", modalities: ["text"] },
      { model: "moonshotai/kimi-k2.7-code", modalities: ["text", "image", "svg", "pdf", "html"] },
      { model: "google/gemini-3.5-flash", modalities: ["text", "image", "svg", "pdf", "html", "audio", "video"] },
    ];

/** Designated self-check driver per output modality (no redundant image-checkers). */
const PREFERRED: Record<string, string> = {
  image: "moonshotai/kimi-k2.7-code", svg: "moonshotai/kimi-k2.7-code",
  pdf: "moonshotai/kimi-k2.7-code", html: "moonshotai/kimi-k2.7-code",
  audio: "google/gemini-3.5-flash", video: "google/gemini-3.5-flash",
};

/** Weight a driver for a tool whose output is `artifactKind` (1 = base, 1.5 = self-checker). */
export function weightFor(model: string, artifactKind?: string): number {
  return artifactKind && PREFERRED[artifactKind] === model ? 1.5 : 1;
}

export const weightedMean = (pairs: Array<{ v: number; w: number }>) => {
  const W = pairs.reduce((a, p) => a + p.w, 0);
  return W ? pairs.reduce((a, p) => a + p.v * p.w, 0) / W : 0;
};
