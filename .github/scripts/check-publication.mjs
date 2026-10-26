import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function assertPublication(root, manifest) {
  const roots = execFileSync("git", ["-C", root, "rev-list", "--max-parents=0", "HEAD"], {
    encoding: "utf8",
  })
    .trim()
    .split(/\s+/)
    .sort();
  assert.deepEqual(roots, [...manifest.roots].sort(), "Unreviewed source ancestry");
  for (const [name, hash] of Object.entries(manifest.assets)) {
    const path = resolve(root, name);
    assert.ok(path.startsWith(`${resolve(root)}/`), "Invalid asset path");
    assert.equal(
      createHash("sha256").update(readFileSync(path)).digest("hex"),
      hash,
      `Unreviewed fixture asset: ${name}`,
    );
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertPublication(
    process.cwd(),
    JSON.parse(readFileSync(".local-quality-publication.json", "utf8")),
  );
  console.log("Approved public root ancestry and original neutral asset hashes match");
}
