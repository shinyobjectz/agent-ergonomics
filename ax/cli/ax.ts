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
      console.log(JSON.stringify(await screen(rest[0]), null, 2));
      break;
    }
    case "deep": {
      const { deep } = await import("../core/workflow.ts");
      console.log(JSON.stringify(await deep(rest[0]), null, 2));
      break;
    }
    case "design": {
      const { screen } = await import("../core/workflow.ts");
      const { designFixes } = await import("../core/designer.ts");
      console.log(JSON.stringify(designFixes(await screen(rest[0])), null, 2));
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
