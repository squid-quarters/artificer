import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { assertPublication } from "./check-publication.mjs";
test("publication validator rejects asset drift and a foreign root ancestry", () => {
  const root = mkdtempSync(resolve(tmpdir(), "artificer-publication-"));
  const git = (...args) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    git("init", "-q");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.invalid");
    writeFileSync(resolve(root, "asset.svg"), "<svg/>");
    git("add", ".");
    git("-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
    const manifest = {
      roots: [git("rev-parse", "HEAD")],
      assets: { "asset.svg": createHash("sha256").update("<svg/>").digest("hex") },
    };
    assertPublication(root, manifest);
    writeFileSync(resolve(root, "asset.svg"), "<svg>changed</svg>");
    assert.throws(() => assertPublication(root, manifest), /Unreviewed fixture asset/);
    assert.throws(
      () => assertPublication(root, { ...manifest, roots: ["0".repeat(40)] }),
      /Unreviewed source ancestry/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
