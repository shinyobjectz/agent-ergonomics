#!/usr/bin/env bun
/**
 * Vendor the pinned `work` binary into ./vendor/work (download per-platform).
 * Tolerant: if no release asset is pinned yet, it falls back to a local reactor
 * build (Apps/workbooks/reactor/zig-out/bin/work) or $OOTA_WORK, and never fails
 * the install. Bump work-pin.json to sync with upstream.
 */
import { existsSync, mkdirSync, copyFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import pin from "../work-pin.json";

const key = `${process.platform === "darwin" ? "darwin" : process.platform}-${process.arch === "arm64" ? "arm64" : "x64"}`;
const dest = join(import.meta.dir, "..", "vendor", "work");
mkdirSync(join(import.meta.dir, "..", "vendor"), { recursive: true });

const asset = (pin as any).assets?.[key];
async function main() {
  if (asset?.url) {
    const res = await fetch(asset.url);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (asset.sha256) {
      const got = createHash("sha256").update(buf).digest("hex");
      if (got !== asset.sha256) throw new Error(`checksum mismatch (${got})`);
    }
    await Bun.write(dest, buf);
    chmodSync(dest, 0o755);
    console.log(`vendored work ${pin.version} (${key}) → ${dest}`);
    return;
  }
  // fallback: local reactor dev build
  const dev = "/Users/shinyobjectz/Apps/workbooks/reactor/zig-out/bin/work";
  if (process.env.OOTA_WORK && existsSync(process.env.OOTA_WORK)) {
    console.log(`using $OOTA_WORK (${process.env.OOTA_WORK}); no vendor copy needed`);
    return;
  }
  if (existsSync(dev)) {
    copyFileSync(dev, dest);
    chmodSync(dest, 0o755);
    console.log(`no release pinned for ${key}; vendored local reactor build → ${dest}`);
    return;
  }
  console.log(`no release asset pinned for ${key} and no local reactor build — set OOTA_WORK or build the reactor. (install not failed)`);
}
main().catch((e) => { console.error("install-work:", e.message); /* never fail install */ });
