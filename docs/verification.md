# Verification scope — 12 October 2026

## Separately preserved prototype

Checks ran on an isolated copy using macOS and Node v24.14.1 with the existing
installed dependency tree copied without reinstalling. This was not clean-install
verification. No application source was changed. These results describe the separately preserved prototype, not the source
now included in this repository.

| Command | Observed result |
| --- | --- |
| `npm run check` | PASS: svelte-check 0 errors, 0 warnings |
| `npm run lint` | PASS: oxlint exit 0 |
| `npm run format:check` | PASS: 27 matched app files |
| `npm run test:unit -w app -- --run` | PASS: 3 files, 5 tests |
| `npm run build -w app` | PASS: Vite 8.0.14 static build |
| Existing Playwright gallery test | PASS: 1/1 with isolated preview configuration and matching browser runtime |

The browser test used an alternate unused port after the default port was found
occupied. No existing server was stopped or reused. The application and test
body were unchanged; only the temporary test-server configuration differed.

Tests cover gallery presence and Effect/scaffold smoke behavior. They do not
verify authoring, MCP, export, fit, widows or print correctness. No Tauri desktop
build, clean install, Storybook build or new OpenSpec proposal was validated.
A SHA-256 check confirmed all 200 preserved regular files match the original.

## Documentation-only candidate

Review scope includes every allowlisted Markdown file, relative links, whitespace,
publication-sensitive content and the entire Git ancestry. The candidate has
fresh history independent of the source snapshot. Review results and a content
manifest were supplied separately. The owner subsequently approved the reviewed
documentation-only bootstrap.
The preserved prototype/assets remain excluded. The subsequently approved clean
source slice adds original fixtures through a reviewed PR.


## First source slice

The source commands in `README.md` now run against the clean implementation.
Native regressions cover project-root confinement, proposal snapshot identity,
revision/content-hash conflicts, crash receipts, lock recovery and editor-only
acceptance. TypeScript tests cover candidate construction and permitted variants.
A browser acceptance test runs real Rust editor and MCP processes, measures
actual DOM layout and verifies rejection, acceptance, undo and reopen.

This automated render evidence is Chromium on macOS. It is not native WebKit
parity, whole-card/print preflight, or a production packaging guarantee.
Production excludes the test bridge. Storybook's Kit 3 compatibility warnings
remain a limitation even when the original dense-card story renders.


Verified on macOS with Node 24.14.1 and Rust 1.94.1:

| Check | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Clean install passes |
| Type / lint / format | 0 type errors or warnings; lint/format pass |
| TypeScript unit tests | 4/4 pass |
| Rust regressions | 11/11 pass |
| Rust Clippy, all targets, warnings denied | Pass |
| Real browser/editor/MCP acceptance | 1/1 pass, including overflow and widow rejection |
| Static frontend and unbundled default Tauri debug build | Pass; no launch/install/signing |
| Production bridge boundary | Rejects before accessing the project folder |
| Storybook build and original dense-card preview | Pass; no page errors; Kit 3 hook/large-chunk warnings recorded |
| Publication and preservation | Three original assets; no old asset hashes/private ancestors; original 200-file hash manifest unchanged |

Independent adversarial review found seven initial issues and a subsequent lock
recovery race. Fixes were rechecked; no implementation blocker remains. The
reviewer independently reproduced proposal replacement refusal, failed-open
scope clearing and cross-process persistent-lock contention/release.


## Synthetic acceptance preparation

The subsequent docs/test-only preparation adds seven original text cases to the
existing end-to-end browser test: **8/8 browser/MCP tests pass**. Paired explicit
widow/null-rule cases demonstrate fixture-specific authority. Overflow cases
verify unchanged disk and disabled acceptance; passing cases require editor
acceptance, preserve symbols/null print profile, and advance revision.

Clean npm installation, type/lint/format checks, 4 TypeScript tests and 11 native
regressions pass. The static frontend build runs as part of browser acceptance.
No runtime/schema/dependency/native permission/media changes are made by this
preparation, so prior packaging/Storybook limitations remain. See
[dense acceptance](dense-acceptance.md) for environment and coverage limits.


## Approved A+C workbench

The redesigned workspace retains the native/schema/constraint architecture.
Twelve real-backend browser/MCP tests pass: the eight prior cases plus four
workbench workflows. Coverage includes before/after text/art review, keyboard
text/canvas scrolling, guarded acceptance and undo, an actual second editor's
measured commit, proposal replacement, failed-open clearing, and preservation
of an unrelated human draft when accepting an agent change.

Axe-core 4.14.0 was installed only in a temporary audit folder and injected via
`ARTIFICER_AXE_PATH`. The WCAG 2 A/AA, 2.1 A/AA and 2.2 AA-tagged rules report
zero violations in the tested empty, editing, failing, comparison, stale, narrow
and failed-open states. This is bounded automated evidence, not screen-reader
or native WebKit certification. Six original screenshot states were inspected.

Type/lint/format checks, four TypeScript tests and eleven native regressions
pass. Storybook builds with the previously recorded Kit 3 compatibility/large
chunk warnings. Independent code/design review found and rechecked dirty-draft
retention and explicit keyboard scrolling issues; the reviewer independently
passed two targeted workbench tests with the accessibility audit enabled.
See [workbench contract](workbench.md) for limits and state authority.

The final static frontend and unbundled default native debug build pass without
launching, signing or installing the app. The default binary rejects test mode
before accessing an empty project folder.


## Headless WebKit verification

On the reviewed workbench baseline, Playwright WebKit passed eleven of twelve
workflows, including 18px body metrics, fit/widow
checks, symbols/art variants, MCP proposals, acceptance, undo and stale/draft
guards. The long-text panel's focused ArrowDown scrolling failed. A shared
keyboard handler fixes that behavior without changing visuals, template rules,
native authority or schema. It handles only unmodified keys targeted at the
region itself and preserves default propagation when the region cannot move.

The configured Chromium and WebKit projects now pass **24/24 workflows** (12 per
engine), with the temporary axe audit enabled in tested workbench states. Dense
fixture tests explicitly assert a matching loaded Crimson Text FontFace and
18px computed font size. The independent reviewer passed two targeted WebKit
workflows with axe and eight isolated keyboard behavior checks. Type, lint,
format, four TypeScript tests and eleven native regression tests also pass.
The supported existing Playwright 1.64 toolchain supplies WebKit 27.2 / build 2370
for macOS 26 arm64; only its matched browser runtime was downloaded into the
temporary browser cache. No project dependency or OS package was added.

This is a bundled Playwright WebKit build in a headless test harness with the
real Rust backend through the development bridge. It does not exercise native
Tauri WKWebView, production IPC/CSP integration, native window focus/menus, or
prove pixel-identical rendering across engines. No native GUI was launched;
full native parity and print/title/footer preflight remain unverified.
