# Full staged commit gate

Use Node24.22.1 from `.nvmrc`, npm11.19.1, Rust1.94.1, the existing Tauri
platform prerequisites, Docker and lockfile-matching Chromium/WebKit runtimes.
Run `npm run quality:install` only in your own development worktree. It refuses
another hook manager and executable default hooks. Merging these files does not
install a hook in another checkout. This is local tooling; no CI or publishing
workflow is introduced.

Every commit exports the raw staged Git blobs into an owned temporary worktree,
including Git's temporary index for path-only commits and commit-a. It never
stashes, stages, resets or copies unrelated working files. Tracked symlinks and
submodules block the gate. Working runner, process helper and loader must match
their staged versions. Tracked bytes, modes, source/snapshot indexes and original
HEAD are checked again before passing.

`.local-quality.json` retains frozen dependency installation, gate fixtures,
lint/types/format/unit tests, locked Rust regressions/build/strict Clippy, both
headless real-backend browser/MCP projects, Storybook, default unbundled Tauri
build and explicit production test-bridge rejection before project access. It
also verifies the approved public ancestry root and neutral asset hashes. New
asset/history authority must be reviewed before changing that inventory. The
security stage uses checked-in JS/TS rule fixtures and official Semgrep1.180.0
pinned by digest, offline network and read-only source mounts. It is a bounded
JS/TS scan, not Rust/Svelte-template or complete security certification.

Browser tests retain strict unused port4187 and refuse existing-server reuse.
Only headless test instances run. Browser install, native app launch, signing,
cloud deployment, publication and credential changes are not gate actions.
Playwright WebKit is not native WKWebView input/IPC/CSP parity. The separate
native testing process still applies to any later native interaction.

Check commands receive a minimal environment without inherited service secrets
or Git index settings. Cancellation enumerates owned descendants, revalidates
individual positive PID identities, signals children before their parent and
verifies termination. It never signals a name, pattern or process group. Failure
to inspect processes blocks starting commands. No other owner's process is
stopped to free a test port. Run heavy checks serially with bounded Cargo jobs.

Each started snapshot run writes fresh pass/failure evidence under this
worktree's Git directory at `local-quality/last.json`. It records tree, parent
HEAD, tool/config/command inputs, timings and outcomes. Cleanup failure changes
success to failure. Receipts never skip a subsequent commit or authorize a
release; eventual commit/output-sensitive verification remains separate.

For offline preparation with an existing npm cache, set `npm_config_offline=true`,
`npm_config_cache`, `npm_config_logs_dir` and `CARGO_NET_OFFLINE=true` explicitly.
A missing dependency/browser/platform prerequisite blocks verification; obtain
any required installation authority separately. Do not weaken a check to pass.
Existing unverified native/platform/design decisions remain unchanged.
