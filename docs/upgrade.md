# Desktop-first stable upgrade proposal — 12 October 2026

User confirmed public documentation bootstrap, desktop/local-first Tauri, browser
later if viable, and dense TCG/LCG cards first. The verified upgrade is now carried into the approved clean source slice with
original fixtures; the old prototype/assets remain excluded.
No project license is selected.

## Upgrade-stage alternatives and subsequent selection

Use a static SvelteKit SPA in Tauri's webview, SSR disabled. Kit 3 config moves
into the Vite plugin; no SvelteKit server runs inside the desktop application.
Fix `frontendDist` to `../build`, relative to `src-tauri`. Preserve native
capabilities; add no filesystem/network/shell grants in this upgrade.

At the upgrade stage, filesystem access needed a designed boundary: selected project root,
canonical path/symlink checks, allowlisted operations and atomic/revision-checked
writes are proposed, not implemented. Compare scoped Rust commands versus the
Tauri filesystem plugin before selection. JSON-file storage versus SQLite,
TS domain logic versus Rust service ownership, MCP stdio versus authenticated
loopback HTTP, and sidecar versus in-process bridge need explicit decisions.
The owner subsequently selected portable JSON/owned assets, project-scoped Rust
commands and local stdio MCP; see `first-slice.md` for the implemented boundary.
Browser delivery remains later feasibility work.

## Verified target dependency matrix

Official npm registry `latest` tags and crates.io stable versions were read on
12 October 2026; no prerelease tags were selected. Node 24.14.1 / Rust 1.94.1
are locally installed. The supported Node range is
`^22.17.0 || ^24.0.0 || >=26.0.0`, the intersection of the selected toolchain
requirements; odd Node 23/25 releases are excluded. Keep TypeScript 6.0.3 because Kit 3 and svelte-check peer
ranges do not accept TypeScript 7; align Node types to runtime major 24.
Keep jsdom 29.1.1 because jsdom 30 requires Node 24.15+ on the current major.
Node 24.21 LTS is available, but no system runtime change is made here.

| Group | Target |
| --- | --- |
| Tauri Rust / build / log / JS CLI | 2.12.3 / 2.7.2 / 2.10.1 / 2.12.2 |
| Svelte / SvelteKit / static adapter / Vite plugin | 5.57.2 / 3.0.1 / 4.0.0 / 7.3.1 |
| Vite / TypeScript / Node types / svelte-check | 8.3.4 / 6.0.3 / 24.19.2 / 4.7.6 |
| Tailwind / Vite integration | 4.3.3 / 4.3.3 |
| Vitest / coverage-v8 / Playwright | 5.0.3 / 5.0.3 / 1.64.0 |
| Storybook core/framework/addons / Svelte CSF / Chromatic addon | 10.6.1 / 5.1.5 / 5.4.0 |
| Testing Library jest-dom / Svelte / jsdom | 7.0.1 / 5.4.2 / 29.1.1 |
| Oxlint / Oxfmt / Crimson Text package | 1.87.0 / 0.72.0 / 5.3.0 |
| Effect / platform / platform-node | 3.22.2 / 0.97.2 / 0.108.2 |
| serde / serde_json / log | 1.0.229 / 1.0.154 / 0.4.34 |

Effect 4.0.3 is stable but changes platform packages and APIs. Retain the latest
compatible Effect 3 cohort for now; raise adoption of Effect 4 as a deliberate
migration decision rather than mixing its Node platform with platform 0.x.
No new library/service architecture is selected by these version updates.

## Migration sequence and checks

1. Update compatible dependencies on Kit 2.70.3 (official recommended staging).
2. Run type/unit/build checks and inspect deprecations.
3. Migrate to Kit 3.0.1 + adapter 4; move config, replace `$lib` imports with
   `#lib`, update generated-tsconfig integration where required.
4. Check lint/format, client/server tests, static build, Storybook, isolated
   Playwright gallery, Rust check/tests and unbundled Tauri build.
5. Independent adversarial diff review; fixes and final checks. Source publication
   requires a PR from the public baseline and a separately resolved asset scope.

Sources: [Tauri SvelteKit integration](https://v2.tauri.app/start/frontend/sveltekit/),
[Kit 3 migration](https://svelte.dev/docs/kit/migrating-to-sveltekit-3),
[Vitest 5 migration](https://vitest.dev/guide/migration/),
[Tauri capabilities](https://v2.tauri.app/security/capabilities/),
[npm Kit release metadata](https://registry.npmjs.org/@sveltejs/kit/3.0.1),
[Svelte release metadata](https://registry.npmjs.org/svelte/5.57.2),
[Vite release metadata](https://registry.npmjs.org/vite/8.3.4),
[Tauri crate metadata](https://crates.io/api/v1/crates/tauri/2.12.3),
[Tauri CLI metadata](https://registry.npmjs.org/@tauri-apps/cli/2.12.2).

## Isolated prototype migration evidence

An isolated source copy passed the Kit 2.70.3 staging type/unit/build checks,
then migrated to Kit 3.0.1 and adapter 4 with Vite configuration, `#lib` subpath
imports (including explicit extensions), and `$app/tsconfig` with explicit
include/exclude. Final type checks, five unit tests, static build, lint and format
checks pass. Tauri Rust compile check passes. The desktop asset path was fixed;
capability permissions and CSP were not expanded or changed.

A clean npm install from the upgraded lockfile passes. Upgraded Playwright passes
the unchanged gallery test (1/1). Rust `cargo check --locked` and
`cargo test --locked` pass; Rust has zero behavioral tests. An unbundled debug
Tauri executable builds successfully without launching, signing or installing it.

Storybook 10.6.1 builds but reports Kit 3 unsupported `transformIndexHtml` hooks.
Its Primary Button story rendered and clicked in a headless browser with no page
errors. This bounded smoke check does not validate every Storybook addon or Kit
mock; broader integration compatibility remains a recorded risk. No warnings were
suppressed. Generated Storybook output is excluded from Git/format checks.

The verified upgrade is carried into the clean first source slice with original
fixtures. The old prototype/assets remain unpublished and unchanged.
