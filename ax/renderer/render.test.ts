import { test, expect } from "bun:test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderReport } from "./render.ts";

test("resolves real source + computes sha", async () => {
  const r = await renderReport(join(import.meta.dir, "../../fixtures/golden.work"));
  expect(r.markdown).toContain("Canonical AX model");
  expect(r.markdown).toMatch(/sha [0-9a-f]{12}/);
  expect(r.drifted.length).toBe(0);
  expect(r.markdown).toContain("| **Loop** |");
  expect(r.markdown).toContain("loop.determinism");
});

test("detects drift on wrong stored sha", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ax-"));
  writeFileSync(join(dir, "code.ts"), "const a = 1;\nconst b = 2;\n");
  const rep = join(dir, "r.work");
  writeFileSync(rep, "```ax\n{\"root\":\".\"}\n```\n\n```source code.ts:1-1 sha=deadbeef0000 ts\n```\n");
  const r = await renderReport(rep);
  expect(r.markdown).toContain("DRIFTED");
  expect(r.drifted.length).toBe(1);
});

test("emits html wrapper", async () => {
  const r = await renderReport(join(import.meta.dir, "../../fixtures/golden.work"));
  expect(r.html).toContain("<!doctype html>");
});
