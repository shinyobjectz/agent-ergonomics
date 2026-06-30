#!/usr/bin/env bun
/**
 * ax — Agent Ergonomics CLI.
 * Verbs are wired phase-by-phase; each dispatches into ax/<area>.
 */
const HELP = `ax — Agent Ergonomics

Usage: ax <command> [args]

  render <report.work>          render a .work AX report → markdown/HTML
  screen <subject>              cheap breadth pass (static + T0 + 1×T1)
  deep <subject>                full battery T0–T6, N=5, ≥3 compaction
  measure <subject>             run instruments → cell readings
  profile <subject>             assemble the AX profile from readings
  design <subject>              readings → prioritized fixes + patches
  eval <subject>                profile → .work report into the subject's repo
  trial <probe> <subject>       run one probe via the workagent harness
  counters <path>               static counters instrument on a path (no agent)
  help                          this message

Subjects: a path to a tool/dir, or an oota tool id (e.g. oota:d2).`;

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
