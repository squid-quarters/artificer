# Dense-card slice: contract and boundaries

## Approved architecture implemented in this slice

A portable folder contains one versioned project JSON and owned assets. Current
card data, template rules, named variants, a shared symbol registry, undo snapshots
and accepted-command receipts live in that JSON. Asset hashes are checked before
rendering. Only static self-contained SVG fixtures are supported initially.

A proposal includes an idempotency key, expected revision, project content hash,
card ID and explicit rules-text/variant changes. Template geometry and symbols
cannot be overridden by these tools. Alternate art keeps the same gameplay record.
There is no text-generation or repair routine.

The editor reads one project snapshot with its hash, builds the candidate, waits
for fonts/images, and measures actual DOM text fragments and symbol placement.
Validation records the exact rendered proposal snapshot and project identity.
Only that editor session can register passing validation and accept the change.
MCP cannot supply a validation report or call acceptance. A visible passing report
is not reusable if the proposal, project bytes, revision or active root changes.

Undo goes through the same preview/validation/acceptance route and advances the
revision. Accepted receipts reconcile interrupted proposal-status writes and make
retries idempotent. Pending changes survive app/process restarts; validation must
be repeated in the new editor session.

## Root and writer contract

The host/editor explicitly selects a root. Rust pins its directory descriptor,
uses descriptor-relative no-follow file/directory operations, rejects traversal
and symlinks, and exposes named project commands rather than generic file access.
Custom Tauri command permissions apply only to the local main window. No generic
filesystem, shell, remote-origin or network capability is granted.

All Artificer writers cooperate with an exclusive project transaction lock.
The project bytes and hash come from a single read; save rechecks the expected
hash immediately before atomic rename and syncs file/directory contents.
Ordinary detected external changes invalidate previews. This is not a claim of
atomic compare-and-swap against an unrelated OS process writing at the same instant.
Edit JSON externally only while the editor/MCP sessions are closed, then reopen.
A persistent lock inode uses exclusive OS advisory locking and is never unlinked
by application writers. A process exit releases the lock automatically. The
explicit editor lock check succeeds only when it is free; it cannot bypass an
active writer. External lock-file deletion or replacement is outside the
cooperating-writer contract.

The descriptor implementation currently requires POSIX platforms and is verified
on macOS. A separate Windows implementation is needed before claiming support.
Project files are bounded to 5 MB and rules text to 20 KB in this initial slice;
these are resource limits, not text-fit or game-design defaults.

## MCP surface

The same native executable runs as `--mcp --project <owned-folder>`. Its stdio
transport supports the tested 2025-11-25 initialization, initialized notification,
ping and tools contract. No 2026 protocol-conformance claim is made.

| Tool | Behavior |
| --- | --- |
| `get_project` | Read the bound project |
| `get_constraints` | Read template/variant/shared-symbol fixture constraints |
| `propose_change` | Create an immutable pending text/variant change |
| `get_proposal` | Read proposal and actual editor validation; absent/stale validation is `not-run` |
| `commit_proposal` | Return `editor-acceptance-required`; no disk commit |
| `propose_undo` | Queue undo for the same editor workflow |

Validation and preview are performed by the editor; the agent observes their
recorded result. There is no standalone headless card renderer, MCP screenshot
endpoint, export route or general asset import tool yet.

## Explicit fixture constraints and unfinished decisions

The neutral sample uses logical preview pixels, font/minimum size 18 px, and an
explicit two-word final-line constraint for multi-line body text. Those values
are fixture choices only. A null widow constraint disables that check; there is
no product-wide rule, language policy or permitted repair policy selected.

Print profile stays null: no physical trim, bleed, DPI or provider defaults are
invented. Body/symbol checks do not constitute whole-card print preflight.
Title/footer fit, multi-card project operations, special frames, renderer/export
parity across Chromium/WebKit, and production packaging remain follow-up work.

## Acceptance evidence

The browser test starts real Rust editor and stdio MCP processes against a copy
of the neutral fixture. It verifies unchanged disk after overflow/widow rejection,
passing actual DOM validation, required editor acceptance, stable art-variant
symbol anchors, stale-write refusal, undo at a new revision, and reopen.
Rust regressions cover proposal replacement, single-card enforcement, content
hash conflicts, accepted retry/crash receipts, persistent lock contention/release, symlink/root
boundaries and malformed MCP requests. Unit render proofs are test seams; the
browser test supplies actual measured reports. Production excludes the bridge.

New geometric SVGs and icon replace no files in the original prototype. The old
45 asset files and recovered skill bundles are not present in this tree/history.
Project licensing remains a separate decision; dependency declarations do not
supply a project reuse grant.
