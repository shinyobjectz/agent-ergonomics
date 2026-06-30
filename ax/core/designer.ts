/**
 * Phase 7 — Designer. Profile readings → prioritized AX fixes, with a concrete
 * patch sketch where the fix is mechanical. Priority: hostile cells first.
 */
import type { Profile } from "./profile.ts";

export interface Fix {
  cell: string;
  priority: number; // 1 = highest
  title: string;
  rationale: string;
  patch?: string; // unified-diff sketch when mechanical
  evidence?: any[];
}

const PLAYBOOK: Record<string, (raw: any) => Omit<Fix, "cell" | "priority" | "evidence">> = {
  "loop.determinism": (raw) => ({
    title: "Remove interactive prompts from the execution path",
    rationale: `An agent can't answer an interactive prompt (${raw?.interactivePrompts ?? "?"} found) — the step blocks forever and runs become non-deterministic. Take all input as flags/params/env.`,
    patch: "- read -p \"Value? \" V\n+ V=\"${1:?usage: <value>}\"   # take as arg/flag, never an interactive prompt",
  }),
  "loop.safety": (raw) => ({
    title: "Guard irreversible operations",
    rationale: `${raw?.irreversibleOps ?? "Some"} unguarded irreversible op(s) (rm -rf / force-push / reset --hard). An autonomous, fallible agent needs these gated, dry-run-able, or scoped to a sandbox.`,
    patch: "- rm -rf \"$DIR\"\n+ [ \"${ALLOW_DESTRUCTIVE:-}\" = 1 ] || { echo 'refusing rm -rf without ALLOW_DESTRUCTIVE=1' >&2; exit 2; }\n+ rm -rf \"$DIR\"",
  }),
  "interface.coherence": (raw) => ({
    title: "DRY the surface (extract shared boilerplate)",
    rationale: `High duplication (ratio ${raw?.duplicationRatio ?? "?"}) — repeated instructions/code make the agent unsure 'what goes where'. Extract shared setup into one sourced helper.`,
  }),
  "recursion.coherence": (raw) => ({
    title: "Single-source the repeated cross-turn scaffolding",
    rationale: `Duplication (ratio ${raw?.duplicationRatio ?? "?"}) repeats across turns → the agent re-implements instead of reusing. Consolidate to one canonical source.`,
  }),
  "disclosure.economy": (raw) => ({
    title: "Right-size the docs",
    rationale: `Docs measure ${raw?.docTokens ?? "?"} tokens — ${(raw?.docTokens ?? 0) > 12000 ? "too large; split with progressive disclosure" : (raw?.docTokens ?? 0) === 0 ? "absent; add a minimal how-to" : "thin"}.`,
  }),
  "disclosure.verifiability": () => ({
    title: "Add a learnable, verifiable example",
    rationale: "No doc/example to confirm understanding before acting. Add a runnable example or reference implementation the agent can check against.",
  }),
};

export function designFixes(profile: Profile): Fix[] {
  const fixes: Fix[] = [];
  const byCell = new Map(profile.cells.map((c) => [`${c.surface}.${c.lens}`, c]));
  // hostile cells → highest priority; then any reading <= -0.2
  const targets = profile.cells
    .filter((c) => c.normalized <= -0.2 || c.level === "hostile")
    .sort((a, b) => a.normalized - b.normalized);
  let p = 1;
  for (const c of targets) {
    const key = `${c.surface}.${c.lens}`;
    const gen = PLAYBOOK[key];
    if (gen) {
      const f = gen(c.raw);
      fixes.push({ cell: key, priority: p++, ...f, evidence: c.evidence });
    } else {
      fixes.push({
        cell: key,
        priority: p++,
        title: `Improve ${key}`,
        rationale: `Reading ${c.normalized.toFixed(2)} (${c.level ?? "low"}). Raise this cell's AX; see the matrix for the lens definition.`,
        evidence: c.evidence,
      });
    }
  }
  return fixes;
}
