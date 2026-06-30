import { test, expect } from "bun:test";
import { groundedBrief, pickSeed } from "./generate.ts";

test("same category → same seed (controlled comparison)", () => {
  expect(groundedBrief("diagrams", "d2").seedId).toBe(groundedBrief("diagrams", "mermaid").seedId);
});
test("sensible category→seed-kind pairing", () => {
  expect(groundedBrief("data-visualization", "vega-lite").seedId.startsWith("dataset:")).toBe(true);
  expect(groundedBrief("video", "remotion").seedId.startsWith("brand:")).toBe(true);
  expect(groundedBrief("diagrams", "d2").seedId.startsWith("repo:")).toBe(true);
});
test("brief carries real material + a file", () => {
  const b = groundedBrief("data-visualization", "vega-lite");
  expect(b.files[0].content).toContain("columns:");
  expect(b.intent).toContain("vega-lite");
});
test("seedKey override rotates the seed", () => {
  expect(pickSeed("brand", "tecovas").id).toBe("tecovas");
});
