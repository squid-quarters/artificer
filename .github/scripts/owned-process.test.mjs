import test from "node:test";
import assert from "node:assert/strict";
import { rememberDescendants, signalOwned } from "./owned-process.mjs";
const row = (pid, parent, start = "same") => ({ pid, parent, start, state: "S" });
test("recursive ownership excludes unrelated processes and retains reparented known children", () => {
  const known = new Map();
  rememberDescendants(
    new Map([
      [10, row(10, 1)],
      [11, row(11, 10)],
      [12, row(12, 11)],
      [99, row(99, 1)],
    ]),
    10,
    known,
  );
  assert.deepEqual([...known.keys()], [10, 11, 12]);
  const delivered = [];
  const current = new Map([
    [11, row(11, 1)],
    [12, row(12, 11)],
    [99, row(99, 1)],
  ]);
  signalOwned(
    known,
    "SIGTERM",
    () => current,
    (pid, signal) => delivered.push([pid, signal]),
  );
  assert.deepEqual(delivered, [
    [12, "SIGTERM"],
    [11, "SIGTERM"],
  ]);
});
test("recycled parent does not grant ownership or receive a cleanup signal", () => {
  const known = new Map([[10, row(10, 1)]]);
  const current = new Map([
    [10, row(10, 1, "replacement")],
    [11, row(11, 10)],
  ]);
  rememberDescendants(current, 10, known);
  assert.deepEqual([...known.keys()], [10]);
  signalOwned(
    known,
    "SIGKILL",
    () => current,
    () => assert.fail("Foreign replacement signalled"),
  );
});
test("own session attributes a child after rapid parent exit but excludes foreign groups", () => {
  const known = new Map();
  const current = new Map([
    [22, { ...row(22, 1), group: 10 }],
    [99, { ...row(99, 1), group: 99 }],
  ]);
  rememberDescendants(current, 10, known, 10);
  assert.deepEqual([...known.keys()], [22]);
  const sent = [];
  signalOwned(
    known,
    "SIGTERM",
    () => current,
    (pid) => sent.push(pid),
  );
  assert.deepEqual(sent, [22]);
});
test("a rapidly orphaned real child is attributed, stopped and makes the command fail", async () => {
  const { runOwned } = await import("./owned-process.mjs");
  const { readFileSync, mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { resolve } = await import("node:path");
  const root = mkdtempSync(resolve(tmpdir(), "artificer-fast-child-"));
  const marker = resolve(root, "pid");
  const leaf = "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)";
  const parent = `const p=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(leaf)}],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(marker)},String(p.pid));process.exit(0)`;
  try {
    const result = await runOwned(process.execPath, ["-e", parent], { stdio: "ignore" }, () => {});
    assert.match(result.error?.message ?? "", /left owned descendants/);
    const pid = Number(readFileSync(marker, "utf8"));
    assert.throws(() => process.kill(pid, 0), /ESRCH/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
