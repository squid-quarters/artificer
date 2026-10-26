import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
// Production must reject the test bridge before reading/writing a project folder.
const project = mkdtempSync(resolve(tmpdir(), "artificer-production-boundary-"));
try {
  const result = spawnSync(
    "app/src-tauri/target/debug/app",
    ["--test-bridge", "--project", project],
    { encoding: "utf8", timeout: 10000, env: { ...process.env, ARTIFICER_TEST_MODE: "1" } },
  );
  assert.ifError(result.error);
  assert.notEqual(result.status, 0, "Production executable accepted test bridge");
  assert.match(
    result.stderr,
    /test|bridge|disabled|unavailable/i,
    "Expected explicit production guard rejection",
  );
  assert.deepEqual(readdirSync(project), [], "Production guard accessed the project");
} finally {
  rmSync(project, { recursive: true, force: true });
}
