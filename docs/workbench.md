# Card workbench and proposal review

The owner selected direction A (card workbench) with C's explicit proposal-review
treatment. This implements that direction within the existing single-card
architecture. It does not select print specifications, change template fit
rules, add a license or tracker, install OpenDesign, or introduce multi-card data.

## Workspace

Project/card context and the pending proposal queue sit on the left. The central
canvas renders the existing dense card at its actual logical size. The inspector
on the right edits rules text and an explicitly permitted named art variant,
then shows measured before/after review. Template geometry, font minimum, final
line rule and shared symbol anchor are inherited read-only values. Recent
accepted receipts supply the sidebar history.

The application's warm neutral surfaces and system-font controls are original
CSS. Card art, font, geometry and constraints stay unchanged. The left/canvas/right
structure and contextual controls draw from the inspected Figma references;
proposal state/history draws from Linear; OpenDesign documentation informed
stable regions and the separation of app design from card constraints. See
[inspected sources](design-directions.md). No reference assets or brand packages
are copied.

At smaller widths, the inspector moves below the workbench; at narrow phone-sized
widths the panes stack. Fixed-size cards scroll inside a labelled, focusable
canvas instead of overflowing the page. Compare mode shows the frozen before
card and the proposed card side by side; keyboard arrows can pan the canvas.
No zoom or CSS transform changes the candidate's measurement coordinates.

## Review and mutation authority

Preview captures one current project snapshot, builds the candidate through the
existing shared function, loads both owned art variants and measures the proposed
DOM. The before/after rules and variant comparison describes exactly that
candidate. Long text panels have named, focusable scroll regions for keyboard
inspection. Passing validation appears only after the Rust record command returns.

Acceptance stays disabled without a passing report for the selected proposal.
It saves only through the existing native acceptance command. Undo uses the same
preview/review route and advances revision. Neither review mode nor switching
inspector views commits a change.

Polling checks current project/proposal identity. A changed project or replaced
proposal clears the passing report, marks the preview stale and disables
acceptance. The frozen comparison remains visible for context. Returning to the
current card is explicit; a new proposal must be measured against that revision.
Operation versions prevent older asynchronous poll results from restoring an
obsolete selection or scope. Native revision/hash/snapshot checks remain the
final authority.

An unsubmitted human rules/art draft survives another editor's save and acceptance
of an independent agent/undo proposal. A pristine draft or one matching the
accepted candidate updates to saved content; an unrelated dirty draft is retained
with an announcement and requires its own new preview. Drafts are in-memory only;
closing/reloading the editor can lose an unsubmitted draft. Switching project
folders explicitly resets the editor state. Failed project opening clears the
old scope, card and acceptance controls.

The queue labels proposals by their actual IDs and kind. They do not infer agent
identity or provenance from an ID prefix. Print readiness remains unavailable:
layout checks cover body/shared symbols, not title/footer or whole-card print.

## Verification boundaries

The eight existing real-backend browser/MCP cases remain the baseline. Additional
workbench cases exercise editor text/art changes, before/after display, keyboard
scrolling, explicit acceptance and undo, a second editor's measured commit,
proposal replacement, failed-open clearing and same-window dirty-draft retention.
They use real Rust editor/MCP processes and the existing test-only browser bridge.

Optional accessibility auditing injects axe-core from `ARTIFICER_AXE_PATH`; it is
an external development tool, not a new project dependency. The audit uses WCAG
2 A/AA, 2.1 A/AA and 2.2 AA tags. Named canvas/text scroll regions intentionally
use tabindex=0; focused native scrolling is tested rather than relying on browser
auto-focus heuristics. Focus moves to the review heading after preview and the
canvas heading after acceptance. Status/failure/stale messages are announced;
form controls are labelled; reduced-motion preferences are respected.

Screenshots can be collected with `ARTIFICER_EVIDENCE_DIR`; test fixture folders
contain no personal card content. Screenshot files stay outside the published
source tree. Automated checks and screenshots are Chromium evidence, not a
screen-reader certification or native WebKit UI parity claim. The native build
is checked without launching or taking the foreground from other projects.
