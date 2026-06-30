/**
 * PiRunner — the real baseline harness-agnostic agent: the PI coding agent
 * (`@earendil-works/pi-coding-agent`) run non-interactively (`pi --print --mode
 * json`) directly in the subject's cwd — no container, no daemon, just the CLI.
 * Telemetry (tokens, turns, compaction, cost, final answer) is parsed straight
 * from PI's event stream — no estimation. Default model: z-ai/glm-5.2 (OpenRouter).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentRunner, TrialInput, TrialRun } from "./agent.ts";

export const DEFAULT_MODEL = process.env.OOTA_MODEL || "z-ai/glm-5.2";
export const DEFAULT_PROVIDER = process.env.OOTA_PROVIDER || "openrouter";

export interface PiParsed {
  success: boolean;
  answer: string;
  turns: number;
  compactionLevels: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  error?: string;
  perTurn: Array<{ turn: number; tokens: number; compactionLevel: number }>;
}

/** Parse PI's JSONL event stream into telemetry. */
export function parsePiEvents(stdout: string): PiParsed {
  let turns = 0, compaction = 0, tokensIn = 0, tokensOut = 0, cost = 0;
  let answer = "";
  let error: string | undefined;
  const perTurn: PiParsed["perTurn"] = [];
  for (const line of stdout.split("\n")) {
    const s = line.trim();
    if (!s.startsWith("{")) continue;
    let e: any;
    try {
      e = JSON.parse(s);
    } catch {
      continue;
    }
    if (e.type === "compaction_end") compaction++;
    if (e.type === "turn_end") {
      turns++;
      const m = e.message ?? {};
      const u = m.usage ?? {};
      const tOut = u.output ?? 0;
      tokensIn += u.input ?? 0;
      tokensOut += tOut;
      cost += u.cost?.total ?? 0;
      if (m.errorMessage) error = m.errorMessage;
      perTurn.push({ turn: turns, tokens: (u.input ?? 0) + tOut, compactionLevel: compaction });
    }
    if (e.type === "message_end" && e.message?.role === "assistant") {
      const txt = (e.message.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
      if (txt) answer = txt;
      if (e.message.stopReason === "error" && e.message.errorMessage) error = e.message.errorMessage;
    }
  }
  return { success: !error && answer.length > 0, answer, turns: Math.max(turns, 1), compactionLevels: compaction, tokensIn, tokensOut, cost, error, perTurn };
}

export class PiRunner implements AgentRunner {
  id = "pi";
  private model = DEFAULT_MODEL;
  private provider = DEFAULT_PROVIDER;

  static available(): boolean {
    return spawnSync("pi", ["--version"], { encoding: "utf8" }).status === 0;
  }

  private buildArgs(input: TrialInput): { args: string[]; cwd: string } {
    const cold = input.tier === "T0" && !input.docsAvailable;
    const cwd = input.docsAvailable ? input.subjectPath : mkdtempSync(join(tmpdir(), "ax-cold-"));
    // T0 cold-call measures PRIOR KNOWLEDGE: can the agent write a correct
    // invocation from memory (no docs, no tools, no execution)? Success = it
    // produced a plausible invocation — not whether it wrote a file.
    const tool = input.tool ?? input.subjectId.replace(/^oota:/, "");
    const intent = cold
      ? `Cold-call. With NO documentation and WITHOUT running anything, write from memory a minimal but VALID invocation/source for the \`${tool}\` tool to produce its primary artifact. Output ONLY the code or command — no prose.`
      : input.intent;
    const args = [
      "--print", "--mode", "json", "--no-session",
      "--provider", this.provider, "--model", this.model,
      ...(cold ? ["--no-tools"] : []),
      intent,
    ];
    return { args, cwd };
  }

  async run(input: TrialInput, seed: number): Promise<TrialRun> {
    const { args, cwd } = this.buildArgs(input);
    const t0 = performance.now();
    // Just run `pi` directly in the subject's cwd — no container, no daemon.
    const r = spawnSync("pi", args, {
      encoding: "utf8",
      cwd,
      timeout: 180000,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env },
    });
    const wallMs = performance.now() - t0;
    const p = parsePiEvents(r.stdout || "");
    if (!p.success && p.error?.includes("No endpoints found"))
      throw new Error(`PI model "${this.model}" not routable on ${this.provider}: ${p.error}`);
    return {
      runId: `pi-${input.probeId}-${seed}`,
      success: p.success,
      turns: p.turns,
      tokensIn: p.tokensIn,
      tokensOut: p.tokensOut,
      retries: 0,
      timeToFirstActionMs: wallMs,
      wallMs,
      exit: r.status ?? 1,
      artifacts: p.success ? ["(agent answer)"] : [],
      perTurn: p.perTurn.map((t) => ({ ...t, goalProgress: 0 })),
      extra: { pi: true, model: this.model, cost: p.cost, transcript: p.answer, answerLen: p.answer.length, error: p.error },
    };
  }
}
