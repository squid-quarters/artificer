# Dense-card slice: contract and boundaries

## Approved architecture implemented in this slice

A portable folder contains one versioned project JSON and owned assets. Current
card data, template rules, named variants, a shared symbol registry, undo snapshots
and accepted-command receipts live in that JSON. Asset hashes are checked before
rendering. Only static self-contained SVG fixtures are supported initially.

A proposal includes an idempotency key, expected revision, project content hash,
card ID and explicit title/rules-text/variant changes. Template geometry and symbols
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
these are resource limits, not text-fit or game-design defaults. The approved title extension below uses the same ceiling for new title changes.

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
Footer fit, multi-card project operations, special frames, renderer/export
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


## Approved title-authoring extension

The owner approved editable titles through UI and MCP with overflow blocking
acceptance, without shrinking or rewriting. The neutral template declares
`titleRegion` (24,22; 247 × 40 logical pixels), `titleFontPx` (25) and
`titleLineHeightPx` (35). These are fixture geometry, not universal card defaults.
Actual DOM title fragments and scroll extents are checked against the declared
box; overlap with body, shared symbol, art or footer is a title-region failure.
Body widow/minimum-font policy and the fixed fixture footer are unchanged.

`propose_change` accepts an optional `title`; omission means unchanged. Title
changes participate in exact preview identity, immutable proposal IDs, durable
receipts, before/after review, stale refusal and undo. A dirty title draft is
retained along with unrelated rules/art drafts. MCP still cannot validate or
accept. New title changes and bounded-template current/history titles use the
existing 20,000-byte text ceiling; project files remain bounded to 5 MB.

Schema version remains 1. Older templates without title declarations stay
readable and keep body/art authoring; their previously unbounded titles are not
silently truncated or migrated. Title editing is unavailable until their
owned template explicitly declares all three title fields. Existing proposals
without title retain their serialized shape and prior payload/receipt hashes.
Old passing reports are not permission to accept a new title change.

Title checks do not establish footer, whole-card print or native keyboard parity.


## Font readiness before layout validation

The renderer requires actual loaded Crimson Text normal 400 (body) and normal
700 (title) faces, including empty titles and legacy templates. It checks the
rendered family/style/weight and the nonempty result of explicit font loading;
every returned face must match and still belong to the current font set.
`document.fonts.ready`, `fonts.check`, or a resolved empty `fonts.load` result
alone do not prove that these faces exist or loaded successfully.

Missing declarations, failed WOFF2/WOFF requests or mismatched faces produce
`font-unavailable` diagnostics for body/title and block acceptance before layout
measurement. Counts are zero placeholders for this failed report; the UI says
"Layout not measured". Delayed faces are awaited. Recovery requires restored
bundled resources and a fresh measured preview; a replaced proposal cannot use
the earlier pending preview. No dependencies, font substitution, automatic text
repair, font installation or print/glyph-coverage guarantee is introduced.


## Validation report persistence failure

Recording a new valid report revokes any earlier in-memory acceptance proof for
that proposal before attempting the report write. A failed write cannot retain
the prior authorization, even if the earlier passing report remains readable on
disk. Restoring the write target alone does not authorize acceptance; a fresh
successfully recorded passing preview is required. Project content, history and
accepted receipts stay unchanged when acceptance is refused.


## Declared body geometry and asset integrity

The measured body content box must match its template's declared position and
size within the existing half-pixel preview tolerance. Checks account for the
card border and body padding/borders; rendered drift, including translation,
produces a body-region failure and blocks acceptance. Text overflow uses that
content box too, so padding cannot enlarge the approved text region. The template geometry,
font/fit/widow policies and editor acceptance authority are unchanged.

Existing asset hashing also rejects changed owned SVG bytes between preview and
acceptance, even when project JSON is unchanged. Regression coverage verifies
saved project/history/receipt and pending-proposal preservation, then recovery
through restored original bytes and a fresh valid preview. No asset import,
print profile or broader design scope is introduced.
