/**
 * Minimal OpenRouter chat helper for the LLM-driven instruments (matchup judge,
 * friction coder). Default model z-ai/glm-5.2. Returns text or parsed JSON.
 */
const MODEL = process.env.OOTA_MODEL || "z-ai/glm-5.2";

export async function llmText(system: string, user: string, temperature = 0): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function llmJSON<T = any>(system: string, user: string): Promise<T> {
  const raw = await llmText(system + "\n\nRespond with ONLY valid JSON, no prose, no code fences.", user);
  const m = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(m ? m[0] : raw) as T;
}
