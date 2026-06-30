import { test, expect } from "bun:test";
import { join } from "node:path";
import { AcpRunner } from "./acp.ts";

test("AcpRunner completes a prompt against an ACP agent (protocol conformance)", async () => {
  process.env.OOTA_ACP_AGENT = `bun ${join(import.meta.dir, "../../fixtures/acp-stub-agent.ts")}`;
  const r = await new AcpRunner().run(
    { probeId: "t1", tier: "T1", subjectId: "x", subjectPath: "/tmp", intent: "say ok", docsAvailable: false },
    0,
  );
  expect(r.success).toBe(true);
  expect(r.tokensIn).toBe(12);
  expect(r.tokensOut).toBe(3);
  expect(r.artifacts.length).toBe(1);
});
