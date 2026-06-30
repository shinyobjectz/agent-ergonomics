import { test, expect } from "bun:test";
import { bradleyTerry } from "./elo.ts";
import { rasch } from "./irt.ts";
import { pareto } from "./pareto.ts";

test("Bradley-Terry: consistent winner ranks highest", () => {
  // a beats b, b beats c, a beats c → a > b > c
  const r = bradleyTerry(["a","b","c"], [
    {a:"a",b:"b",winner:"a"},{a:"a",b:"b",winner:"a"},
    {a:"b",b:"c",winner:"b"},{a:"b",b:"c",winner:"b"},
    {a:"a",b:"c",winner:"a"},{a:"a",b:"c",winner:"a"},
  ]);
  expect(r.a).toBeGreaterThan(r.b);
  expect(r.b).toBeGreaterThan(r.c);
});

test("Rasch: higher pass-rate subject gets higher ability; harder item higher difficulty", () => {
  // subjects s1(all pass) s2(mixed) s3(none); items easy(all) hard(few)
  const R = [
    [1,1,1,1], // s1 strong
    [1,1,0,0], // s2 mid
    [0,0,0,0], // s3 weak
  ];
  const { ability, difficulty } = rasch(["s1","s2","s3"], ["i1","i2","i3","i4"], R);
  expect(ability.s1).toBeGreaterThan(ability.s2);
  expect(ability.s2).toBeGreaterThan(ability.s3);
  // i1/i2 passed more than i3/i4 → easier (lower β)
  expect(difficulty.i3).toBeGreaterThan(difficulty.i1);
});

test("Pareto: dominated point not on frontier", () => {
  const r = pareto([
    {id:"best", success:1, cost:100, turns:1},
    {id:"dom",  success:0.5, cost:500, turns:5}, // dominated by best
    {id:"cheap",success:0.8, cost:50,  turns:2}, // trades success for cost → frontier
  ]);
  const m = Object.fromEntries(r.map(x=>[x.id,x.onFrontier]));
  expect(m.best).toBe(true);
  expect(m.cheap).toBe(true);
  expect(m.dom).toBe(false);
});
