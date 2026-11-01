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

test("narrow inspector header preserves user text spacing without clipping", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.locator(".app-header")).toHaveCSS("height", "64px");
  await page.setViewportSize({ width: 320, height: 1000 });
  await expect(page.locator(".app-header")).toHaveCSS("height", "64px");
  const body = page.getByTestId("inspector-proposed").getByTestId("card-body");
  const geometry = () =>
    body.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const frame = el.closest("article")!.getBoundingClientRect();
      return {
        x: rect.left - frame.left,
        y: rect.top - frame.top,
        width: rect.width,
        height: rect.height,
        font: getComputedStyle(el).fontSize,
      };
    });
  const before = await geometry();
  await page.addStyleTag({
    content: `
    :is(.app-header, .demo-notice, .context, .canvas-toolbar, .snapshot-bar, .diagnostics, .inspector),
    :is(.app-header, .demo-notice, .context, .canvas-toolbar, .snapshot-bar, .diagnostics, .inspector) * {
      line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important;
    }
    p { margin-bottom: 2em !important; }
  `,
  });
  const layout = await page.evaluate(() => {
    const badge = document.querySelector(".prototype-tag")!.getBoundingClientRect();
    const header = document.querySelector(".app-header")!.getBoundingClientRect();
    const brand = document.querySelector(".brand")!.getBoundingClientRect();
    const spacing = getComputedStyle(document.querySelector(".prototype-tag")!);
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewport: innerWidth,
      letterSpacing: Number.parseFloat(spacing.letterSpacing),
      wordSpacing: Number.parseFloat(spacing.wordSpacing),
      lineHeight: Number.parseFloat(spacing.lineHeight),
      brandLeft: brand.left,
      brandRight: brand.right,
      brandTop: brand.top,
      brandBottom: brand.bottom,
      badgeTop: badge.top,
      headerTop: header.top,
      headerHeight: header.height,
      nonOverlapping:
        brand.right <= badge.left ||
        badge.right <= brand.left ||
        brand.bottom <= badge.top ||
        badge.bottom <= brand.top,
      badgeLeft: badge.left,
      badgeRight: badge.right,
      badgeBottom: badge.bottom,
      headerLeft: header.left,
      headerRight: header.right,
      headerBottom: header.bottom,
    };
  });
  expect(layout.letterSpacing).toBeCloseTo(1.44);
  expect(layout.wordSpacing).toBeCloseTo(1.92);
  expect(layout.lineHeight).toBe(18);
  expect(layout.headerHeight).toBeGreaterThan(64);
  expect(layout.nonOverlapping).toBe(true);
  expect(layout.brandLeft).toBeGreaterThanOrEqual(layout.headerLeft);
  expect(layout.brandRight).toBeLessThanOrEqual(layout.headerRight);
  expect(layout.brandTop).toBeGreaterThanOrEqual(layout.headerTop);
  expect(layout.brandBottom).toBeLessThanOrEqual(layout.headerBottom);
  expect(layout.badgeTop).toBeGreaterThanOrEqual(layout.headerTop);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.badgeLeft).toBeGreaterThanOrEqual(layout.headerLeft);
  expect(layout.badgeRight).toBeLessThanOrEqual(layout.headerRight);
  expect(layout.badgeBottom).toBeLessThanOrEqual(layout.headerBottom);
  expect(await geometry()).toEqual(before);
  await page.getByRole("button", { name: "Compare current and proposed", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Current example card", exact: true }),
  ).toBeVisible();
  expect(await geometry()).toEqual(before);
  await capture(page, "inspector-user-text-spacing");
});

test("fixture identity failure is explicit and a reload recovers without project commands", async ({
  page,
}) => {
  const rawFixture = await readFile("../fixtures/neutral-project/project.artificer.json", "utf8");
  const pageErrors: string[] = [];
  let rawDigestCalls = 0;
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.exposeFunction("rejectFixtureDigestOnce", () => ++rawDigestCalls === 1);
  await page.addInitScript((raw: string) => {
    const nativeDigest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = async (algorithm, data) => {
      if (
        new TextDecoder().decode(data) === raw &&
        (await (window as any).rejectFixtureDigestOnce())
      )
        throw new Error("Controlled fixture identity failure");
      return nativeDigest(algorithm, data);
    };
    (window as any).__fixtureFailureCalls = [];
    (window as any).__TAURI_INTERNALS__ = {
      invoke: (...args: any[]) => {
        (window as any).__fixtureFailureCalls.push(args);
        throw new Error("No project commands allowed");
      },
    };
  }, rawFixture);
  await open(page);
  await expect(page.getByTestId("source-fixture-hash")).toHaveText("Unavailable");
  await expect(page.getByText("Fixture identity unavailable", { exact: true })).toBeVisible();
  await page.getByText("Fixture identity unavailable", { exact: true }).click();
  await expect(page.getByTestId("fixture-identity-error")).toContainText(
    "Reload this local preview to retry",
  );
  await expect(page.getByTestId("example-snapshot-hash")).toHaveText(/^[0-9a-f]{64}$/);
  const measuredHash = await page.getByTestId("example-snapshot-hash").textContent();
  expect(rawDigestCalls).toBe(1);
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(() => (window as any).__fixtureFailureCalls)).toEqual([]);
  await capture(page, "inspector-fixture-identity-unavailable");
  await page.reload();
  await expect(page.getByTestId("inspector-status")).toHaveAttribute("data-status", "pass");
  await expect(page.getByTestId("source-fixture-hash")).toHaveText(
    createHash("sha256").update(rawFixture).digest("hex"),
  );
  await expect(page.getByTestId("fixture-identity-error")).toHaveCount(0);
  await expect(page.getByTestId("example-snapshot-hash")).toHaveText(measuredHash!);
  expect(rawDigestCalls).toBe(2);
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(() => (window as any).__fixtureFailureCalls)).toEqual([]);
  expect(await readFile("../fixtures/neutral-project/project.artificer.json", "utf8")).toBe(
    rawFixture,
  );
});
