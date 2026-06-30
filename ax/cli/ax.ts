#!/usr/bin/env bun
/**
 * ax — Agent Ergonomics CLI.
 * Verbs are wired phase-by-phase; each dispatches into ax/<area>.
 */
const HELP = `ax — Agent Ergonomics

Usage: ax <command> [args]

  screen <subject> [--behavioral] [--agent pi]   static (always) + optional real T0/T1
  deep <subject> [--agent pi]   full battery T0–T6 via the real PI agent
  design <subject>              readings → prioritized fixes + patches
  eval <subject> [--deep]       profile → .work report into the subject's repo
  bench <subjects…> [--tiers T0,T1,T3] [--n 1]   cross-tool: Elo/IRT/Pareto/friction
  brief <category> <tool> [seedKey]   preview a grounded, seed-backed brief
  counters <path>               static counters instrument (no agent)
  render <report.work>          render a .work AX report → markdown/HTML
  leaderboard | site            OOTA AX leaderboard / agentergonomics.org site
  work                          status of the vendored `work` CLI (.work parsing)
  help                          this message

Subjects: an oota tool id (oota:<cat>-<tool>) or a path. Real runs use the PI
agent (z-ai/glm-5.2); briefs are grounded in real seed entities for comparability.`;

const [cmd, ...rest] = process.argv.slice(2);
const flag = (args: string[], name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function run() {
  switch (cmd) {
    case "render": {
      const { renderReport } = await import("../renderer/render.ts");
      if (!rest[0]) throw new Error("usage: ax render <report.work>");
      const out = await renderReport(rest[0]);
      console.log(out.markdown);
      break;
    }
    case "counters": {
      const { runCounters } = await import("../instruments/counters.ts");
      if (!rest[0]) throw new Error("usage: ax counters <path>");
      console.log(JSON.stringify(await runCounters(rest[0]), null, 2));
      break;
    }
    case "screen": {
      const { screen } = await import("../core/workflow.ts");
      const subj = rest.find((a) => !a.startsWith("--"))!;
      const agentId = flag(rest, "--agent");
      console.log(JSON.stringify(await screen(subj, { behavioral: rest.includes("--behavioral"), agentId }), null, 2));
      break;
    }
    case "deep": {
      const { deep } = await import("../core/workflow.ts");
      const subj = rest.find((a) => !a.startsWith("--"))!;
      console.log(JSON.stringify(await deep(subj, 5, flag(rest, "--agent")), null, 2));
      break;
    }
    case "design": {
      const { screen } = await import("../core/workflow.ts");
      const { designFixes } = await import("../core/designer.ts");
      const subj = rest.find((a) => !a.startsWith("--"))!;
      console.log(JSON.stringify(designFixes(await screen(subj, { behavioral: rest.includes("--behavioral"), agentId: flag(rest, "--agent") })), null, 2));
      break;
    }
    case "eval": {
      const { evalSubject } = await import("../report/build.ts");
      const deepFlag = rest.includes("--deep");
      const subj = rest.find((a) => !a.startsWith("--"))!;
      const r = await evalSubject(subj, { deep: deepFlag });
      console.error(`wrote ${r.reportPath}${r.drifted.length ? ` (drifted: ${r.drifted.length})` : ""}`);
      console.log(r.rendered);
      break;
    }
    case "bench": {
      const { benchmark } = await import("../core/benchmark.ts");
      const subjects = rest.filter((a) => !a.startsWith("--") && a !== flag(rest, "--tiers") && a !== flag(rest, "--n") && a !== flag(rest, "--agent"));
      const tiers = flag(rest, "--tiers")?.split(",");
      const nv = flag(rest, "--n");
      const r = await benchmark(subjects, { tiers, n: nv ? +nv : 1, agentId: flag(rest, "--agent") });
      console.error(`benchmark → ${r.runDir}`);
      console.log(JSON.stringify({ elo: r.elo, irt_ability: r.irt.ability, irt_difficulty: r.irt.difficulty, pareto: r.pareto, friction: r.friction }, null, 2));
      break;
    }
    case "brief": {
      const { groundedBrief } = await import("../briefs/generate.ts");
      const b = groundedBrief(rest[0] ?? "topic", rest[1] ?? "tool", rest[2]);
      console.log(b.intent + "\n\n--- " + b.files[0].name + " ---\n" + b.files[0].content);
      break;
    }
    case "work": {
      const { workStatus } = await import("../harness/work.ts");
      const s = workStatus();
      console.log(JSON.stringify(s, null, 2));
      if (!s.ok) console.error(s.binary ? "⚠ version mismatch or unverified" : "⚠ no work binary — run scripts/install-work.ts or set OOTA_WORK");
      break;
    }
    case "site": {
      const { buildSite } = await import("../site/build.ts");
      const { resolve } = await import("node:path");
      const out = resolve(rest[0] ?? "site");
      const r = await buildSite(out);
      console.error(`built site → ${out} (${r.count} subjects)`);
      break;
    }
    case "leaderboard": {
      const { ootaLeaderboard } = await import("../report/leaderboard.ts");
      const r = await ootaLeaderboard();
      console.error(`wrote ${r.path} (${r.count} tools)`);
      const { renderReport } = await import("../renderer/render.ts");
      console.log((await renderReport(r.path)).markdown);
      break;
    }
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

run().catch((e) => {
  console.error("ax error:", e?.message ?? e);
  process.exit(1);
});
