import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { rpc } from "./helpers/rpc.ts";
import catalog from "../../fixtures/dense-cases.json" with { type: "json" };

for (const fixture of catalog.cases) {
  test(`synthetic dense fixture: ${fixture.id}`, async ({ page }) => {
    const root = await mkdtemp(join(tmpdir(), "artificer-dense-case-"));
    await cp(resolve("../fixtures/neutral-project"), root, { recursive: true });
    const file = join(root, "project.artificer.json");
    const project = JSON.parse(await readFile(file, "utf8"));
    // Explicit supported fixture rule, set offline before either session opens.
    project.templates[0].lastLineMinWords = fixture.lastLineMinWords;
    project.cards[0].title = fixture.title;
    await writeFile(file, JSON.stringify(project));
    const original = await readFile(file, "utf8");
    const binary = resolve("src-tauri/target/debug/app");
    const editor = spawn(binary, ["--test-bridge", "--project", root]);
    const agent = spawn(binary, ["--mcp", "--project", root]);
    const editorCall = rpc(editor),
      agentCall = rpc(agent);
    const tool = (name: string, args: object = {}) =>
      agentCall({ jsonrpc: "2.0", method: "tools/call", params: { name, arguments: args } });
    try {
      await agentCall({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "dense-fixture-test", version: "1" },
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
      const anchor = () =>
        page.getByTestId("shared-symbol").evaluate((el) => ({
          x: (el as HTMLElement).offsetLeft,
          y: (el as HTMLElement).offsetTop,
        }));
      const originalAnchor = await anchor();
      const queued = await tool("propose_change", {
        id: fixture.id,
        expectedRevision: 1,
        cardId: "fixture-card",
        body: fixture.body,
        variantId: fixture.variantId,
      });
      expect(queued.isError).not.toBe(true);
      await page.getByRole("button", { name: `Preview ${fixture.id}` }).click();
      await expect(page.getByTestId("validation-status")).toHaveText(
        `Validation ${fixture.status}`,
      );
      const measured = (await tool("get_proposal", { id: fixture.id })).structuredContent
        .validation;
      expect(measured.status).toBe(fixture.status);
      for (const code of fixture.requiredDiagnostics)
        expect(measured.diagnostics.map((d: any) => d.code)).toContain(code);
      if (fixture.id === "explicit-widow")
        expect(measured.diagnostics.map((d: any) => d.code)).not.toContain("overflow");
      if (fixture.status === "pass") expect(measured.diagnostics).toEqual([]);
      expect(await anchor()).toEqual(originalAnchor);
      expect(await readFile(file, "utf8")).toBe(original);
      const accept = page.getByRole("button", { name: "Accept preview", exact: true });
      if (fixture.status === "fail") {
        await expect(accept).toBeDisabled();
        expect(
          (await tool("commit_proposal", { id: fixture.id })).structuredContent.committed,
        ).toBe(false);
        expect(await readFile(file, "utf8")).toBe(original);
      } else {
        await expect(accept).toBeEnabled();
        await accept.click();
        await expect(page.getByTestId("revision")).toHaveText("Revision 2");
        const saved = JSON.parse(await readFile(file, "utf8"));
        expect(saved.cards[0].body).toBe(fixture.body);
        expect(saved.cards[0].variantId).toBe(fixture.variantId);
        expect(saved.cards[0].templateId).toBe(project.cards[0].templateId);
        expect(saved.symbols).toEqual(project.symbols);
        expect(saved.printProfile).toBeNull();
      }
    } finally {
      const exited = (child: typeof editor) =>
        new Promise<void>((done) => {
          if (child.exitCode !== null || child.signalCode !== null) done();
          else {
            child.once("exit", () => done());
            child.kill();
          }
        });
      await Promise.all([exited(editor), exited(agent)]);
      await rm(root, { recursive: true, force: true });
    }
  });
}
