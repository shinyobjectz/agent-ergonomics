/**
 * Resolve & guard the Zig `work` CLI (the reactor). Vendored as a pinned prebuilt
 * (download on install); never forked. Sync WORK_PIN to upstream reactor.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export const WORK_PIN = "0.1.0"; // keep synced to github.com/workbooks-sh/workbooks.sh/reactor

const DEV_BUILD = "/Users/shinyobjectz/Apps/workbooks/reactor/zig-out/bin/work";

/** Resolution order: $OOTA_WORK → vendored prebuilt → local reactor dev build. */
export function workBinary(): string | null {
  if (process.env.OOTA_WORK && existsSync(process.env.OOTA_WORK)) return process.env.OOTA_WORK;
  const vendored = join(import.meta.dir, "../../vendor/work");
  if (existsSync(vendored)) return vendored;
  if (existsSync(DEV_BUILD)) return DEV_BUILD;
  return null;
}

export function workVersion(bin: string): string | null {
  try {
    const r = spawnSync(bin, ["--version"], { encoding: "utf8", timeout: 5000 });
    return (r.stdout || r.stderr || "").trim() || null;
  } catch {
    return null;
  }
}

/** True if the resolved binary matches the pinned version (staleness guard). */
export function pinOk(bin: string): boolean {
  const v = workVersion(bin);
  return !!v && v.includes(WORK_PIN);
}

export interface WorkStatus {
  binary: string | null;
  version: string | null;
  pinned: string;
  ok: boolean;
}

export function workStatus(): WorkStatus {
  const binary = workBinary();
  const version = binary ? workVersion(binary) : null;
  return { binary, version, pinned: WORK_PIN, ok: !!version && version.includes(WORK_PIN) };
}
