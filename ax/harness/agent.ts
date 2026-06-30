/**
 * Phase 2 — trial harness. Pluggable AgentRunner so the probe battery is
 * agent-agnostic. The REAL baseline is the PI coding agent (ax/harness/pi.ts);
 * explicit harnesses are driven via ACP (ax/harness/acp.ts). MockAgent here is
 * TEST-ONLY (deterministic, labeled) and never feeds a real profile —
 * pickRunner returns null instead of mocking when no real agent is present.
 */
import { createHash } from "node:crypto";

export interface TrialInput {
  probeId: string;
  tier: string;
  subjectId: string;
  subjectPath: string;
  intent: string;
  docsAvailable: boolean;
  tool?: string; // tool name, for the T0 cold-call (from-memory invocation)
  compactionLevels?: number; // for T5
}

export interface TrialRun {
  runId: string;
  success: boolean;
  turns: number;
  tokensIn: number;
  tokensOut: number;
  retries: number;
  timeToFirstActionMs: number;
  wallMs: number;
  exit: number;
  artifacts: string[];
  transcriptRef?: string;
  perTurn?: Array<{ turn: number; tokens: number; compactionLevel: number; goalProgress: number }>;
  extra?: Record<string, any>;
}

export interface AgentRunner {
  id: string;
  run(input: TrialInput, seed: number): Promise<TrialRun>;
}

/** Deterministic pseudo-metrics from a stable hash — reproducible, labeled mock. */
export class MockAgent implements AgentRunner {
  id = "mock";
  async run(input: TrialInput, seed: number): Promise<TrialRun> {
    const h = createHash("sha256").update(`${input.subjectId}:${input.probeId}:${seed}`).digest();
    const u = (i: number) => h[i] / 255; // 0..1
    const cold = input.tier === "T0" && !input.docsAvailable;
    const success = u(0) > (cold ? 0.45 : 0.12);
    const turns = 1 + Math.round(u(1) * (cold ? 6 : 4));
    return {
      runId: `mock-${input.probeId}-${seed}`,
      success,
      turns,
      tokensIn: 400 + Math.round(u(2) * 3000),
      tokensOut: 200 + Math.round(u(3) * 1500),
      retries: Math.round(u(4) * (success ? 1 : 3)),
      timeToFirstActionMs: 200 + Math.round(u(5) * 1500),
      wallMs: 1000 + Math.round(u(6) * 20000),
      exit: success ? 0 : 1,
      artifacts: success ? ["out/artifact"] : [],
      perTurn: Array.from({ length: turns }, (_, t) => ({
        turn: t + 1,
        tokens: 300 + Math.round(u((t % 20) + 8) * 1200),
        compactionLevel: input.compactionLevels ? Math.floor((t / turns) * input.compactionLevels) : 0,
        goalProgress: Math.min(1, (t + 1) / turns * (0.6 + u(7) * 0.5)),
      })),
      extra: { mock: true },
    };
  }
}

/**
 * Honest runner selection. `mock` is TEST-ONLY (never feeds a real profile).
 * Default = the real PI agent if installed; else null → behavioral tiers are
 * SKIPPED (cells stay unmeasured) rather than silently faked.
 */
export async function pickRunner(id?: string): Promise<AgentRunner | null> {
  if (id === "mock") return new MockAgent();
  if (id === "acp") return new (await import("./acp.ts")).AcpRunner();
  const { PiRunner } = await import("./pi.ts");
  if (id === "pi") return new PiRunner();
  return PiRunner.available() ? new PiRunner() : null; // baseline = real PI, else skip
}
