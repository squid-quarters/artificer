# Artificer

Artificer is desktop/local-first card layout software for TCG/LCG designers,
with broader card workflows planned. This first source slice implements one
portable dense-card project, actual rendered body-text checks, shared symbols,
named art variants, revision-checked persistence, editor acceptance and undo.
Local stdio MCP authors pending changes through that same pipeline. The approved
[card workbench](docs/workbench.md) places project/proposal context beside a large
card canvas and rules/template inspector, with explicit before/after review.

## First-slice scope

- Exactly one card per project and undo snapshot; multiple cards are rejected.
- One versioned `project.artificer.json` with owned, hashed, static SVG assets.
- Body overflow, declared minimum font size, explicit fixture widow rule, and
  shared symbol anchor checks. No automatic rewrite or font shrinking.
- MCP changes stay pending until accepted in the editor after a measured preview.
- Undo restores prior card content at a new revision. Stale or replaced proposals
  cannot reuse an earlier passing validation.
- Filesystem operations use pinned POSIX directory handles and no-follow lookups.
  This slice is verified on macOS; Windows support is not implemented.
- Print profile is unset. There is no bleed, print-provider preset, raster/PDF
  export, special-frame editor, or production-wide widow threshold.

## Run locally

Use a supported Node runtime (`^22.17.0 || ^24.0.0 || >=26.0.0`) and Rust 1.94.1
(the tested toolchain). Install the normal Tauri platform prerequisites.

```sh
npm ci
npm run tauri -w app -- dev
```

Copy `fixtures/neutral-project` to a folder you own, then open that folder in the
editor. The sample art and icon are original geometric fixtures. The application
uses Crimson Text from its OFL-licensed dependency; a project license has not
been selected. No reuse license is implied.

To run the stdio MCP endpoint, first build the native executable:

```sh
npm run tauri -w app -- build --debug --no-bundle --ci
app/src-tauri/target/debug/app --mcp --project <owned-project-folder>
```

MCP uses the tested 2025-11-25 initialization/tools contract. Logs go to stderr;
stdout is protocol messages only. There is no HTTP MCP service or credential.
The host explicitly supplies one project root; tools cannot switch roots.

## Verification and process

```sh
npm run check
npm run lint
npm run format:check
npm run test:unit -w app -- --run
cargo test --manifest-path app/src-tauri/Cargo.toml --features test-bridge
cargo build --manifest-path app/src-tauri/Cargo.toml --features test-bridge
npx playwright install --only-shell chromium webkit
npm run test:e2e -w app
```

Playwright needs its matching browser installed. E2E uses the actual Rust backend
through a development-only bridge; production builds reject that mode. The browser
suite measures actual Chromium and Playwright WebKit DOM, including loaded
Crimson Text, not mocked text-width estimates. Select one engine with
`npm run test:e2e -w app -- --project=webkit` (or `chromium`). These headless
engines do not constitute native Tauri WKWebView UI parity. Storybook's Kit 3 compatibility
warnings remain tracked; build success alone does not prove all addons work.

Native interaction tests follow the [native test process](docs/native-testing.md):
coordinate foreground ownership, verify the actual target before each input
batch, use scoped delivery, and stop when delivery or results are inconclusive.
An unavailable native controller leaves that check unverified; global HID input
is not a fallback.

Read [AGENTS.md](AGENTS.md), [implementation and boundaries](docs/first-slice.md),
[product constraints](docs/product.md), and [pending decisions](docs/decisions.md).
See [synthetic dense acceptance](docs/dense-acceptance.md),
[proposed constraint matrix](docs/constraint-matrix.md) and
[desktop design directions](docs/design-directions.md) for the reviewed preparation
and choices that gate broader work. All integration uses independently reviewed
PRs with fixes and final checks.
The old prototype, its unattributed samples, bundled skills and private recovery
history remain preserved separately and are absent from this source ancestry.
