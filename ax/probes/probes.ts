/**
 * Phase 3 — probe battery (T0–T6 + static).
 * Comparability: intentTemplate is constant; subject binding makes content
 * tool-specific. A probe runs the AgentRunner N times → ProbeResult (raw signals).
 */
import type { AgentRunner, TrialRun } from "../harness/agent.ts";

export interface ProbeDef {
  id: string;
  tier: "T0" | "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "static";
  intentTemplate: string;
  measures: string[]; // cell ids
  docsAvailable: boolean;
  compactionLevels?: number;
}

export const PROBES: ProbeDef[] = [
  { id: "t0-coldcall", tier: "T0", docsAvailable: false, intentTemplate: "Produce the tool's representative artifact with NO docs.", measures: ["interface.prior_alignment", "interface.legibility", "disclosure.prior_alignment"] },
  { id: "t1-guided", tier: "T1", docsAvailable: true, intentTemplate: "Produce the tool's representative artifact, docs available.", measures: ["loop.verifiability", "loop.economy", "disclosure.economy", "interface.verifiability"] },
  { id: "t2-multiturn", tier: "T2", docsAvailable: true, intentTemplate: "Carry a staged, evolving task across many turns.", measures: ["recursion.coherence", "recursion.economy"] },
  { id: "t3-failure", tier: "T3", docsAvailable: true, intentTemplate: "Recover from a seeded broken state / wrong input.", measures: ["loop.safety", "loop.verifiability"] },
  { id: "t4-pairwise", tier: "T4", docsAvailable: true, intentTemplate: "Same intent, two tools — which is more agent-ergonomic?", measures: [] },
  { id: "t5-compaction", tier: "T5", docsAvailable: true, compactionLevels: 3, intentTemplate: "Work until context exhausts → compact → continue, ≥3 levels.", measures: ["recursion.determinism", "recursion.coherence"] },
  { id: "t6-refine", tier: "T6", docsAvailable: true, intentTemplate: "Push past a first acceptable output; count completion states; self-correct.", measures: ["recursion.verifiability", "interface.verifiability"] },
  { id: "static", tier: "static", docsAvailable: true, intentTemplate: "(no run — static inspection)", measures: [] },
];

export interface ProbeResult {
  probeId: string;
  subjectId: string;
  tier: string;
  agent: string;
  runs: TrialRun[];
}

export async function runProbe(
  probe: ProbeDef,
  subject: { id: string; path: string; intent: string },
  runner: AgentRunner,
  n: number,
): Promise<ProbeResult> {
  const runs: TrialRun[] = [];
  for (let seed = 0; seed < n; seed++) {
    runs.push(
      await runner.run(
        {
          probeId: probe.id,
          tier: probe.tier,
          subjectId: subject.id,
          subjectPath: subject.path,
          intent: subject.intent,
          docsAvailable: probe.docsAvailable,
          compactionLevels: probe.compactionLevels,
        },
        seed,
      ),
    );
  }
  return { probeId: probe.id, subjectId: subject.id, tier: probe.tier, agent: runner.id, runs };
}
