import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { cp, mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { rpc } from "./helpers/rpc.ts";

async function harness(page: Page) {
  const root = await mkdtemp(join(tmpdir(), "artificer-workbench-"));
  await cp(resolve("../fixtures/neutral-project"), root, { recursive: true });
  const binary = resolve("src-tauri/target/debug/app");
  const children: ChildProcessWithoutNullStreams[] = [];
  const start = (mode: string) => {
    const child = spawn(binary, [mode, "--project", root]);
    children.push(child);
    return child;
  };
  const agent = start("--mcp"),
    call = rpc(agent);
  await call({
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "workbench-test", version: "1" },
    },
  });
  agent.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const attach = async (target: Page) => {
    const editorCall = rpc(start("--test-bridge"));
    await target.exposeFunction("rustInvoke", (method: string, args: object) =>
      editorCall({ method, args }),
    );
    await target.addInitScript(() => {
      (window as any).__TAURI_INTERNALS__ = {
        invoke: (method: string, args: object) => (window as any).rustInvoke(method, args),
      };
    });
    await target.goto("/");
  };
  await attach(page);
  return {
    root,
    attach,
    tool: (name: string, args: object = {}) =>
      call({ jsonrpc: "2.0", method: "tools/call", params: { name, arguments: args } }),
    saved: async () => JSON.parse(await readFile(join(root, "project.artificer.json"), "utf8")),
    cleanup: async () => {
      await Promise.all(
        children.map(
          (child) =>
            new Promise<void>((done) => {
              if (child.exitCode !== null || child.signalCode !== null) done();
              else {
                child.once("exit", () => done());
                child.kill();
              }
            }),
        ),
      );
      await rm(root, { recursive: true, force: true });
    },
  };
}
async function open(page: Page, root: string) {
  await page.getByLabel("Project folder", { exact: true }).fill(root);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.getByTestId("revision")).toHaveText("Revision 1");
}
async function audit(page: Page) {
  // Optional external audit script, installed outside the project: no runtime dependency.
  if (!process.env.ARTIFICER_AXE_PATH) return;
  await page.addScriptTag({ content: await readFile(process.env.ARTIFICER_AXE_PATH, "utf8") });
  const results = await page.evaluate(async () =>
    (window as any).axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    }),
  );
  expect(
    results.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })),
  ).toEqual([]);
}
async function evidence(page: Page, name: string) {
  if (!process.env.ARTIFICER_EVIDENCE_DIR) return;
  await mkdir(process.env.ARTIFICER_EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: join(process.env.ARTIFICER_EVIDENCE_DIR, `${name}.png`),
    fullPage: true,
  });
}

test("keyboard regions preserve boundaries, editing and acceptance focus", async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 1000 });
  const app = await harness(page);
  try {
    await open(page, app.root);
    const original = await app.saved();
    await page.getByLabel("Rules text", { exact: true }).fill("Dense review text ".repeat(100));
    await page.getByRole("button", { name: "Preview editor change", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Review change", exact: true })).toBeFocused();
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "fail");
    const rules = page.getByRole("region", { name: "After rules text" });
    await rules.focus();
    const top = () => rules.evaluate((el) => el.scrollTop);
    const bottom = () => rules.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(await bottom()).toBeGreaterThan(0);
    await page.keyboard.press("ArrowDown");
    await expect.poll(top).toBeGreaterThan(0);
    await page.keyboard.press("ArrowUp");
    await expect.poll(top).toBe(0);
    await page.keyboard.press("PageDown");
    await expect.poll(top).toBeGreaterThan(40);
    await page.keyboard.press("PageUp");
    await expect.poll(top).toBe(0);
    await page.keyboard.press("End");
    await expect.poll(top).toBe(await bottom());
    await page.keyboard.press("Home");
    await expect.poll(top).toBe(0);
    await expect(rules).toBeFocused();

    // Observe cancellation after the app handler; emitted keys alone are insufficient.
    await page.evaluate(() => {
      (window as any).regionKeys = [];
      window.addEventListener("keydown", (event) => {
        (window as any).regionKeys.push({ key: event.key, prevented: event.defaultPrevented });
      });
    });
    await page.keyboard.press("ArrowUp");
    expect(await page.evaluate(() => (window as any).regionKeys.at(-1))).toEqual({
      key: "ArrowUp",
      prevented: false,
    });
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowDown");
    expect(await page.evaluate(() => (window as any).regionKeys.at(-1))).toEqual({
      key: "ArrowDown",
      prevented: false,
    });
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    expect(await page.evaluate(() => (window as any).regionKeys.at(-1))).toEqual({
      key: "ArrowDown",
      prevented: true,
    });

    // Synthetic events isolate modifier handling from browser shortcuts/default scrolling.
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) {
      const result = await rules.evaluate((el, modifier) => {
        const before = el.scrollTop;
        const event = new KeyboardEvent("keydown", {
          key: "ArrowDown",
          bubbles: true,
          cancelable: true,
          [modifier]: true,
        });
        el.dispatchEvent(event);
        return { before, after: el.scrollTop, prevented: event.defaultPrevented };
      }, modifier);
      expect(result.after).toBe(result.before);
      expect(result.prevented).toBe(false);
    }

    await page.getByRole("button", { name: "Compare cards", exact: true }).click();
    const canvas = page.getByRole("region", { name: "Card preview canvas" });
    await canvas.focus();
    const left = () => canvas.evaluate((el) => el.scrollLeft);
    const right = () => canvas.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(await right()).toBeGreaterThan(0);
    expect(await canvas.evaluate((el) => el.scrollHeight - el.clientHeight)).toBe(0);
    await page.keyboard.press("ArrowRight");
    await expect.poll(left).toBeGreaterThan(0);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(left).toBe(0);
    await page.keyboard.press("End");
    await expect.poll(left).toBe(await right());
    await page.keyboard.press("Home");
    await expect.poll(left).toBe(0);
    await expect(canvas).toBeFocused();

    // A controlled descendant fixture guards bubbling without adding an editable card UI.
    await page.keyboard.press("ArrowRight");
    await expect.poll(left).toBeGreaterThan(0);
    expect(await left()).toBeLessThan(await right());
    await canvas.evaluate((el) => {
      const input = document.createElement("textarea");
      input.id = "keyboard-descendant-fixture";
      input.value = "editable child";
      el.append(input);
      input.focus();
      input.setSelectionRange(5, 5);
    });
    const child = page.locator("#keyboard-descendant-fixture");
    const beforeChild = await left();
    expect(beforeChild).toBeGreaterThan(0);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => child.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(4);
    expect(await left()).toBe(beforeChild);
    expect(await page.evaluate(() => (window as any).regionKeys.at(-1).prevented)).toBe(false);
    await child.evaluate((el) => el.remove());
    expect(await app.saved()).toEqual(original);

    await page.getByRole("button", { name: "Return to current card", exact: true }).click();
    const body = page.getByLabel("Rules text", { exact: true });
    await body.fill("Gain two focus.");
    await body.focus();
    await body.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 5));
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => body.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(4);
    await page.getByRole("button", { name: "Preview editor change", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Review change", exact: true })).toBeFocused();
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "pass");
    await page.getByRole("button", { name: "Accept preview", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("revision")).toHaveText("Revision 2");
    await expect(page.locator(".canvas-toolbar h2")).toBeFocused();
    expect((await app.saved()).cards[0].body).toBe("Gain two focus.");
    await page.keyboard.press("Tab");
    await expect(canvas).toBeFocused();
  } finally {
    await app.cleanup();
  }
});

test("workbench supports measured editor review, keyboard comparison, explicit acceptance and undo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1120, height: 820 });
  const app = await harness(page);
  try {
    await audit(page);
    await evidence(page, "empty-workbench");
    await open(page, app.root);
    const context = await page
      .getByRole("complementary", { name: "Project and proposals" })
      .boundingBox();
    const main = await page.getByRole("main").boundingBox();
    const inspector = await page
      .getByRole("complementary", { name: "Card inspector" })
      .boundingBox();
    expect(context!.x).toBeLessThan(main!.x);
    expect(main!.x).toBeLessThan(inspector!.x);
    await audit(page);
    await evidence(page, "card-workbench");
    const original = await app.saved();
    await page.getByLabel("Rules text", { exact: true }).fill("Dense review text ".repeat(100));
    await page.getByRole("button", { name: "Preview editor change", exact: true }).click();
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "fail");
    await expect(page.getByRole("button", { name: "Accept preview", exact: true })).toBeDisabled();
    expect(await app.saved()).toEqual(original);
    const longRules = page.getByRole("region", { name: "After rules text" });
    await longRules.focus();
    await expect(longRules).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => longRules.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await audit(page);
    await evidence(page, "layout-failure");
    await page.getByRole("button", { name: "Return to current card", exact: true }).click();
    await page.getByLabel("Rules text", { exact: true }).fill("Gain two focus.");
    await page.getByLabel("Art variant", { exact: true }).selectOption("alternate");
    await page.getByRole("button", { name: "Preview editor change", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "pass");
    await expect(page.getByRole("heading", { name: "Review change", exact: true })).toBeFocused();
    await expect(page.getByTestId("before-rules")).toHaveText(original.cards[0].body);
    await expect(page.getByTestId("after-rules")).toHaveText("Gain two focus.");
    const selectedId = await page.getByTestId("review-proposal-id").innerText();
    await expect(
      page
        .getByRole("complementary", { name: "Project and proposals" })
        .getByRole("button", { pressed: true }),
    ).toContainText(selectedId);
    await expect(page.getByTestId("change-diff")).toContainText(/standard\s*→\s*alternate/);
    expect(await app.saved()).toEqual(original);
    await page.getByRole("button", { name: "Compare cards", exact: true }).click();
    await expect(page.getByTestId("current-proof")).toBeVisible();
    const canvas = page.getByRole("region", { name: "Card preview canvas" });
    await canvas.focus();
    await expect(canvas).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => canvas.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await canvas.evaluate((el) => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    });
    await audit(page);
    await evidence(page, "proposal-comparison");
    await page.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 2");
    const accepted = await app.saved();
    expect(accepted.cards[0].body).toBe("Gain two focus.");
    expect(accepted.cards[0].variantId).toBe("alternate");
    expect(accepted.symbols).toEqual(original.symbols);
    expect(accepted.printProfile).toBeNull();
    await page.getByRole("button", { name: "Preview undo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Review undo", exact: true })).toBeVisible();
    await expect(page.getByTestId("before-rules")).toHaveText("Gain two focus.");
    await expect(page.getByTestId("after-rules")).toHaveText(original.cards[0].body);
    await page.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 3");
    expect((await app.saved()).cards).toEqual(original.cards);
    await page.setViewportSize({ width: 760, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await audit(page);
    await evidence(page, "narrow-workbench");
  } finally {
    await app.cleanup();
  }
});

test("another editor's accepted change invalidates a pass and preserves the local draft", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  const app = await harness(page);
  const other = await context.newPage();
  try {
    await open(page, app.root);
    await page.getByLabel("Rules text", { exact: true }).fill("Gain two focus.");
    await page.getByRole("button", { name: "Preview editor change", exact: true }).click();
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "pass");
    await app.attach(other);
    await open(other, app.root);
    await other.getByLabel("Rules text", { exact: true }).fill("Keep three focus.");
    await other.getByRole("button", { name: "Preview editor change", exact: true }).click();
    await expect(other.getByTestId("validation-status")).toHaveAttribute("data-status", "pass");
    await other.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(other.getByTestId("revision")).toHaveText("Revision 2");
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "stale");
    await expect(page.getByRole("button", { name: "Accept preview", exact: true })).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText("Preview is stale");
    expect((await app.saved()).cards[0].body).toBe("Keep three focus.");
    await audit(page);
    await evidence(page, "stale-proposal");
    await page.getByRole("button", { name: "Edit card", exact: true }).click();
    await expect(page.getByLabel("Rules text", { exact: true })).toHaveValue("Gain two focus.");
    await page.getByRole("button", { name: "Return to current card", exact: true }).click();
    await expect(page.getByTestId("active-proof").getByTestId("card-body")).toHaveText(
      "Keep three focus.",
    );
    await page.getByRole("button", { name: "Preview editor change", exact: true }).click();
    await expect(page.getByTestId("before-rules")).toHaveText("Keep three focus.");
    await expect(page.getByTestId("after-rules")).toHaveText("Gain two focus.");
    await page.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 3");
    expect((await app.saved()).cards[0].body).toBe("Gain two focus.");
  } finally {
    await other.close();
    await app.cleanup();
  }
});

test("replaced MCP proposal loses visible validation and failed open clears the workspace", async ({
  page,
}) => {
  const app = await harness(page);
  try {
    await open(page, app.root);
    const original = await app.saved();
    await app.tool("propose_change", {
      id: "agent-focus",
      expectedRevision: 1,
      cardId: "fixture-card",
      body: "Gain two focus.",
    });
    await page.getByRole("button", { name: "Preview agent-focus" }).click();
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "pass");
    const request = join(app.root, ".artificer/requests/agent-focus.json");
    const changed = JSON.parse(await readFile(request, "utf8"));
    changed.body = "Changed after measurement.";
    await writeFile(request, JSON.stringify(changed));
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "stale");
    await expect(page.getByRole("button", { name: "Accept preview", exact: true })).toBeDisabled();
    expect(await app.saved()).toEqual(original);
    await page.getByRole("button", { name: "Change project", exact: true }).click();
    await page.getByLabel("Project folder", { exact: true }).fill(join(app.root, "missing-folder"));
    await page.getByRole("button", { name: "Open project", exact: true }).click();
    await expect(page.getByTestId("active-proof")).toHaveCount(0);
    await expect(page.getByTestId("revision")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Accept preview", exact: true })).toHaveCount(0);
    await expect(page.getByRole("alert")).toContainText("Action needs attention");
    expect(await app.saved()).toEqual(original);
    await audit(page);
  } finally {
    await app.cleanup();
  }
});

test("accepting an independent agent change retains a dirty human body and art draft", async ({
  page,
}) => {
  const app = await harness(page);
  try {
    await open(page, app.root);
    await page.getByLabel("Rules text", { exact: true }).fill("Keep four focus.");
    await page.getByLabel("Art variant", { exact: true }).selectOption("alternate");
    await app.tool("propose_change", {
      id: "agent-review",
      expectedRevision: 1,
      cardId: "fixture-card",
      body: "Gain two focus.",
    });
    await page.getByRole("button", { name: "Preview agent-review" }).click();
    await expect(page.getByTestId("validation-status")).toHaveAttribute("data-status", "pass");
    await page.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 2");
    expect((await app.saved()).cards[0].body).toBe("Gain two focus.");
    expect((await app.saved()).cards[0].variantId).toBe("standard");
    await expect(page.getByLabel("Rules text", { exact: true })).toHaveValue("Keep four focus.");
    await expect(page.getByLabel("Art variant", { exact: true })).toHaveValue("alternate");
    await expect(page.getByRole("status")).toContainText("unsubmitted draft is retained");
    await page.getByRole("button", { name: "Preview editor change", exact: true }).click();
    await expect(page.getByTestId("before-rules")).toHaveText("Gain two focus.");
    await expect(page.getByTestId("after-rules")).toHaveText("Keep four focus.");
    await page.getByRole("button", { name: "Accept preview", exact: true }).click();
    await expect(page.getByTestId("revision")).toHaveText("Revision 3");
    expect((await app.saved()).cards[0].body).toBe("Keep four focus.");
    expect((await app.saved()).cards[0].variantId).toBe("alternate");
  } finally {
    await app.cleanup();
  }
});
