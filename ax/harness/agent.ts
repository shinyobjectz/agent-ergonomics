/**
 * Phase 2 — trial harness. Pluggable AgentRunner so the probe battery is
 * agent-agnostic. Ships a deterministic MockAgent (for pipeline tests + the
 * static-tier Screen) and a WorkagentRunner stub (real integration is the
 * Phase-2 build task — it throws honestly until wired, so nothing fakes a run).
 */
import { createHash } from "node:crypto";

export interface TrialInput {
  probeId: string;
  tier: string;
  subjectId: string;
  subjectPath: string;
  intent: string;
  docsAvailable: boolean;
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
 * Real workagent driver — shells to the Zig `work` CLI (the reactor).
 * `work agent run <name> "<brief>"` runs an agent on a brief. Trials run against
 * a local nexus (spin per benchmark run); telemetry detail is pulled from the
 * `work runs` ledger. Throws actionable errors until the binary + a reachable
 * agent are present (use --agent mock for the static/Screen tier meanwhile).
 */
export class WorkagentRunner implements AgentRunner {
  id = "workagent";
  private agent = process.env.OOTA_AGENT || "workagent";

  async run(input: TrialInput, seed: number): Promise<TrialRun> {
    const { workBinary, pinOk, WORK_PIN, workVersion } = await import("./work.ts");
    const { spawnSync } = await import("node:child_process");
    const bin = workBinary();
    if (!bin)
      throw new Error(
        "no `work` binary — vendor it (download pinned reactor build), set $OOTA_WORK, or build Apps/workbooks/reactor (`zig build`). Use --agent mock for static runs.",
      );
    if (!pinOk(bin))
      throw new Error(`work version ${workVersion(bin)} != pinned ${WORK_PIN} — refresh the vendored binary so trials aren't stale.`);

    // brief: the probe intent bound to the subject (docs withheld for T0 cold-call).
    const brief = `${input.intent}${input.docsAvailable ? "" : " (no docs — cold)"} [${input.subjectId}]`;
    const t0 = performance.now();
    const r = spawnSync(bin, ["agent", "run", this.agent, brief], { encoding: "utf8", timeout: 120000 });
    const wallMs = performance.now() - t0;
    const answer = (r.stdout || "").trim();
    if (r.status !== 0 && !answer) {
      throw new Error(
        `work agent run failed (exit ${r.status}). Likely needs \`work login\` + a local nexus with a "${this.agent}" agent. ${(r.stderr || "").trim().slice(0, 200)}`,
      );
    }
    const success = r.status === 0 && answer.length > 0;
    return {
      runId: `work-${input.probeId}-${seed}`,
      success,
      turns: 1, // CLI one-shot; multi-turn telemetry comes from `work runs` (TODO)
      tokensIn: Math.ceil(brief.length / 4),
      tokensOut: Math.ceil(answer.length / 4),
      retries: 0,
      timeToFirstActionMs: wallMs,
      wallMs,
      exit: r.status ?? 1,
      artifacts: success ? ["(agent answer)"] : [],
      extra: { workReal: true, agent: this.agent, ledgerTelemetry: "TODO: parse `work runs`" },
    };
  }
}

export function pickRunner(id?: string): AgentRunner {
  if (id === "workagent") return new WorkagentRunner();
  return new MockAgent();
}
