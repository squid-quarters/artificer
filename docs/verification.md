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
