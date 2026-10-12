import { expect, test } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
function rpc(process: ChildProcessWithoutNullStreams) {
  let id = 0;
  const pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  const lines = createInterface({ input: process.stdout });
  lines.on("line", (line) => {
    const result = JSON.parse(line);
    const waiter = pending.get(result.id);
    if (!waiter) return;
    pending.delete(result.id);
    if (result.error)
      waiter.reject(
        new Error(typeof result.error === "string" ? result.error : result.error.message),
      );
    else waiter.resolve(result.result);
  });
  process.on("exit", () => {
    for (const waiter of pending.values()) waiter.reject(new Error("Rust process exited"));
  });
  return (message: object) =>
    new Promise<any>((resolve, reject) => {
      const next = ++id;
      pending.set(next, { resolve, reject });
      process.stdin.write(JSON.stringify({ ...message, id: next }) + "\n");
    });
}
test("MCP proposal → actual rendered validation → editor acceptance → stale refusal → undo/reopen", async ({
  page,
}) => {
  const root = await mkdtemp(join(tmpdir(), "artificer-e2e-"));
  await cp(resolve("../fixtures/neutral-project"), root, { recursive: true });
  const binary = resolve("src-tauri/target/debug/app");
  const editor = spawn(binary, ["--test-bridge", "--project", root]);
  const agent = spawn(binary, ["--mcp", "--project", root]);
  const editorCall = rpc(editor),
    agentCall = rpc(agent);
  const tool = async (name: string, args: object = {}) =>
    agentCall({ jsonrpc: "2.0", method: "tools/call", params: { name, arguments: args } });
  try {
    await agentCall({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "acceptance-test", version: "1" },
      },
    });
    agent.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
    );
    await page.exposeFunction("rustInvoke", (method: string, args: object) =>
      editorCall({ method, args }),
    );
    await page.addInitScript(() => {
      (window as any).__TAURI_INTERNALS__ = {
        invoke: (method: string, args: object) => (window as any).rustInvoke(method, args),
      };
    });
    await page.goto("/");
    await page.getByLabel("Project folder").fill(root);
    await page.getByRole("button", { name: "Open project", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 1");
    const original = await readFile(join(root, "project.artificer.json"), "utf8");
    const anchor = () =>
      page.getByTestId("shared-symbol").evaluate((el) => ({
        x: (el as HTMLElement).offsetLeft,
        y: (el as HTMLElement).offsetTop,
      }));
    const symbolBefore = await anchor();
    const overflow = "Dense fixture text ".repeat(100);
    await tool("propose_change", {
      id: "overflow",
      expectedRevision: 1,
      cardId: "fixture-card",
      body: overflow,
    });
    await page.getByRole("button", { name: "Preview overflow", exact: true }).click();
    await expect(page.getByTestId("validation-status")).toHaveText("Validation fail");
    await expect(page.getByRole("button", { name: "Accept preview", exact: true })).toBeDisabled();
    expect(await readFile(join(root, "project.artificer.json"), "utf8")).toBe(original);
    expect(
      (
        await tool("get_proposal", { id: "overflow" })
      ).structuredContent.validation.diagnostics.some((d: any) => d.code === "overflow"),
    ).toBe(true);
    expect((await tool("commit_proposal", { id: "overflow" })).structuredContent.committed).toBe(
      false,
    );
    await tool("propose_change", {
      id: "widow",
      expectedRevision: 1,
      cardId: "fixture-card",
      body: "Draw one card.\nFocus.",
    });
    await page.getByRole("button", { name: "Preview widow", exact: true }).click();
    await expect(page.getByTestId("validation-status")).toHaveText("Validation fail");
    await expect(page.getByRole("button", { name: "Accept preview", exact: true })).toBeDisabled();
    const widowReport = (await tool("get_proposal", { id: "widow" })).structuredContent.validation;
    expect(widowReport.diagnostics.some((d: any) => d.code === "widow")).toBe(true);
    expect(widowReport.diagnostics.some((d: any) => d.code === "overflow")).toBe(false);
    expect(await readFile(join(root, "project.artificer.json"), "utf8")).toBe(original);
    await tool("propose_change", {
      id: "valid",
      expectedRevision: 1,
      cardId: "fixture-card",
      body: "Gain two focus.",
      variantId: "alternate",
    });
    await page.getByRole("button", { name: "Preview valid", exact: true }).click();
    await expect(page.getByTestId("validation-status")).toHaveText("Validation pass");
    expect(await anchor()).toEqual(symbolBefore);
    await page.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 2");
    await expect(page.getByTestId("card-body")).toHaveText("Gain two focus.");
    const committed = await readFile(join(root, "project.artificer.json"), "utf8");
    expect(
      (
        await tool("propose_change", {
          id: "stale",
          expectedRevision: 1,
          cardId: "fixture-card",
          body: "Overwrite.",
        })
      ).isError,
    ).toBe(true);
    expect(await readFile(join(root, "project.artificer.json"), "utf8")).toBe(committed);
    expect((await tool("get_project", { path: "../outside" })).isError).toBe(true);
    await tool("propose_undo", { id: "undo", expectedRevision: 2 });
    await page.getByRole("button", { name: "Preview undo", exact: true }).last().click();
    await expect(page.getByTestId("validation-status")).toHaveText("Validation pass");
    await page.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 3");
    expect(JSON.parse(await readFile(join(root, "project.artificer.json"), "utf8")).cards).toEqual(
      JSON.parse(original).cards,
    );
    await page.reload();
    await page.getByLabel("Project folder").fill(root);
    await page.getByRole("button", { name: "Open project", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 3");
  } finally {
    editor.kill();
    agent.kill();
    await rm(root, { recursive: true, force: true });
  }
});
