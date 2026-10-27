import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function open(page: Page) {
  await page.goto("/inspector");
  await expect(page.getByTestId("inspector-status")).toHaveAttribute("data-status", "pass");
}
async function capture(page: Page, name: string) {
  const dir = process.env.ARTIFICER_EVIDENCE_DIR;
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(dir, `${test.info().project.name}-${name}.png`),
    fullPage: true,
  });
}

test("read-only inspector preserves rendered geometry and cannot issue project commands", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const file = "../fixtures/neutral-project/project.artificer.json";
  const original = await readFile(file, "utf8");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") requests.push(r.method());
  });
  await page.addInitScript(() => {
    (window as any).__inspectorCalls = [];
    (window as any).__TAURI_INTERNALS__ = {
      invoke: (...args: any[]) => {
        (window as any).__inspectorCalls.push(args);
        throw new Error("No project command allowed");
      },
    };
  });
  await open(page);
  await expect(page.getByText("Read-only prototype", { exact: true })).toBeVisible();
  await expect(page.getByTestId("local-counts")).toContainText("rendered body lines");
  const proof = page.getByTestId("inspector-proposed");
  const geometry = () =>
    proof.getByTestId("card-body").evaluate((el) => {
      const box = el.getBoundingClientRect(),
        frame = el.closest("article")!.getBoundingClientRect();
      return {
        x: box.left - frame.left,
        y: box.top - frame.top,
        width: box.width,
        height: box.height,
        font: getComputedStyle(el).fontSize,
        text: el.textContent,
      };
    });
  const before = await geometry();
  await capture(page, "inspector-overview");
  const picker = page.getByRole("group", { name: "Inspect region" });
  await picker.getByRole("button", { name: "Title", exact: true }).click();
  await expect(page.getByTestId("region-overlay")).toHaveCSS("width", "247px");
  expect(await geometry()).toEqual(before);
  await picker.getByRole("button", { name: "Symbol", exact: true }).click();
  await expect(page.getByTestId("anchor-overlay")).toBeVisible();
  expect(await geometry()).toEqual(before);
  await picker.getByRole("button", { name: "Body", exact: true }).click();
  await page.getByRole("button", { name: "Hide region highlight", exact: true }).click();
  await expect(page.getByTestId("region-overlay")).toHaveCount(0);
  expect(await geometry()).toEqual(before);
  await page.getByRole("button", { name: "Show region highlight", exact: true }).click();
  await page.getByRole("button", { name: "Compare current and proposed", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Current example card", exact: true }),
  ).toBeVisible();
  expect(await geometry()).toEqual(before);
  await page.getByText("Fixture identity", { exact: true }).click();
  await expect(page.getByTestId("example-snapshot-hash")).toHaveText(/^[0-9a-f]{64}$/);
  await expect(page.getByTestId("source-fixture-hash")).toHaveText(
    createHash("sha256").update(original).digest("hex"),
  );
  await expect(page.getByRole("button", { name: /Accept|Save|Commit|Undo/i })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__inspectorCalls)).toEqual([]);
  expect(requests).toEqual([]);
  expect(await readFile(file, "utf8")).toBe(original);
  await capture(page, "inspector-compare");
});

for (const example of [
  { label: "Body overflow", status: "fail", code: "overflow" },
  { label: "Final-line failure", status: "fail", code: "widow" },
  { label: "Unavailable font", status: "fail", code: "font-unavailable" },
  { label: "Stale proposal", status: "stale", code: null },
  { label: "Legacy title", status: "pass", code: null },
]) {
  test(`inspector shows honest ${example.label} evidence`, async ({ page }) => {
    await open(page);
    await page
      .getByRole("group", { name: "Preview scenario" })
      .getByRole("button", { name: new RegExp(`^${example.label}`) })
      .click();
    await expect(page.getByTestId("inspector-status")).toHaveAttribute(
      "data-status",
      example.status,
    );
    await expect(page.locator(".diagnostics")).toHaveAttribute("aria-busy", "false");
    if (example.code) await expect(page.locator(".local-findings")).toContainText(example.code);
    if (example.label === "Unavailable font") {
      await expect(page.getByTestId("unmeasured-note")).toContainText("Layout not measured");
      await expect(page.getByTestId("local-counts")).toHaveCount(0);
    } else if (example.label === "Stale proposal") {
      await expect(page.locator(".stale-note")).toContainText("frozen revision 1");
      await expect(page.locator(".snapshot-bar")).toContainText("Current example: revision 2");
      await expect(page.getByTestId("local-counts")).toHaveCount(0);
      await page.getByRole("button", { name: "Compare current and proposed", exact: true }).click();
      await expect(
        page.getByRole("region", { name: "Current example card", exact: true }),
      ).toContainText("Saved Focus");
      await expect(page.getByTestId("inspector-proposed")).toContainText("Pending Focus");
    } else if (example.label === "Legacy title") {
      await page
        .getByRole("group", { name: "Inspect region" })
        .getByRole("button", { name: "Title", exact: true })
        .click();
      await expect(page.locator(".legacy-note")).toContainText("No declared title bounds");
      await expect(page.getByTestId("region-overlay")).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Title not checked", exact: true }),
      ).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Inspect body", exact: true }).first().click();
      await expect(page.getByRole("heading", { name: "Rules text", exact: true })).toBeFocused();
      await expect(page.getByTestId("local-counts")).toBeVisible();
    }
    await expect(page.locator(".region-detail .passing")).toHaveCount(0);
    await capture(page, `inspector-${example.label.toLowerCase().replaceAll(" ", "-")}`);
  });
}

test("late local measurement cannot replace evidence for the selected scenario", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeDigest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = async (algorithm, data) => {
      const value = new TextDecoder().decode(data);
      const result = await nativeDigest(algorithm, data);
      if (value.startsWith('{"schemaVersion":1,') && value.includes('"titleRegion"'))
        (window as any).__oldInspectorDigestDone = true;
      return result;
    };
    const original = HTMLImageElement.prototype.decode;
    let first = true;
    HTMLImageElement.prototype.decode = function () {
      const decoded = original.call(this);
      if (!first) return decoded;
      first = false;
      return decoded.then(
        () =>
          new Promise<void>((resolve) => {
            (window as any).__releaseInspectorImage = resolve;
          }),
      );
    };
  });
  await page.goto("/inspector");
  await expect
    .poll(() => page.evaluate(() => typeof (window as any).__releaseInspectorImage))
    .toBe("function");
  await page.getByRole("button", { name: /^Legacy title/ }).click();
  await expect(page.getByTestId("inspector-status")).toHaveAttribute("data-status", "pass");
  await expect(page.getByTestId("example-snapshot-hash")).toHaveText(/^[0-9a-f]{64}$/);
  const selectedHash = (await page.getByTestId("example-snapshot-hash").textContent())!;
  await page.evaluate(() => (window as any).__releaseInspectorImage());
  await expect.poll(() => page.evaluate(() => (window as any).__oldInspectorDigestDone)).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByTestId("example-snapshot-hash")).toHaveText(selectedHash);
  await expect(page.getByTestId("inspector-status")).toHaveAttribute("data-status", "pass");
  await expect(page.locator(".snapshot-bar")).toContainText("demo-legacy");
  await expect(page.locator(".local-findings")).toHaveCount(0);
});

test("narrow inspector keeps controls visible and supports keyboard canvas panning", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Compare current and proposed", exact: true }).click();
  const canvas = page.getByRole("region", { name: "Read-only card canvas", exact: true });
  await canvas.focus();
  const before = await canvas.evaluate((el) => el.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => canvas.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
  await expect(
    page.getByRole("button", { name: "Hide region highlight", exact: true }),
  ).toBeEnabled();
  await capture(page, "inspector-narrow");
});
