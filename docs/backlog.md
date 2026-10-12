# Reconciled backlog — proposals, no tracker migration

## Preserved records

GitHub: [repository issues](https://github.com/squid-quarters/artificer/issues),
0 open and 0 closed; [PRs](https://github.com/squid-quarters/artificer/pulls),
0 open and 0 closed at recovery. Paperclip: no dedicated Artificer project or
feature issue; one completed administrative repository-retention cross-reference
was found, not a feature ticket.
Historical tasks are in the separately preserved OpenSpec archive, excluded
from this candidate. Nothing is deleted, moved,
closed, or duplicated into either tracker by this reconciliation.

| Item | Origin and status | Dependency / acceptance |
| --- | --- | --- |
| Recovery baseline and PR bootstrap | Reviewed documentation-only baseline published; source snapshot stays private | Bootstrap complete; subsequent reviewed PRs; preserved prototype/assets remain excluded |
| Product and architecture confirmation | Selected architecture implemented in first slice; remaining policy pending | Resolve decisions register; retain evidence labels |
| Tracker choice | Current user; pending | Select GitHub, Paperclip, or linked roles before creating execution tickets |
| Foundation | Historical phase 0 archive; stack present | Current checks pass where recorded; bundle delta remains historical concern |
| Card model and shared render path | First slice: single-card schema/DOM path; broader library pending | Confirm schema/storage/renderer; acceptance fixtures |
| Bidirectional authoring | First slice: shared proposal/acceptance + hashes; multi-card pending | Confirm model; conflict and external-write behavior |
| CLI | MCP stdio executable implemented; general CLI pending | Shared core; approved command and filesystem contract |
| MCP constraint authoring | First slice: proposals/constraints/editor reports; export pending | Constraint discovery, mutation policy, structured diagnostics; sequence reconsideration pending |
| Text fit and widow policy | First slice: body overflow + explicit fixture widow rule | Product-wide policy/overrides unresolved; actual rendered fixtures |
| Shared symbol anchors and alternate-art exceptions | First slice: same anchor across named art variants | Cross-type fixtures and intentional geometry exceptions pending |
| Bleed/print pipeline | Current user + earlier README export intent; absent | Resolve dimensional inconsistency and printer/output profile |
| Special frames and templates | Current user + historical phase 5; absent | Choose first card family and frame fixtures |
| Workbench design | A+C selected; single-card workbench/proposal review implemented | Existing constraints/authority retained; broader redesign remains scoped follow-up |
| Regression and desktop completion | First slice: native/browser regressions; wider parity pending | Golden renders, agent/human parity; Tauri integration/build validation |

The original phase plan put MCP fourth. The owner approved the early end-to-end
MCP slice; broader phase ordering remains a proposal. There are no invented issue numbers, estimates or completion claims.

## First source slice

The approved architecture is implemented for one card per project with original
neutral fixtures. MCP proposals, actual body/symbol validation, editor acceptance,
revision/content-hash checks and undo are covered by native and browser tests.
Multiple-card operations, print output, special frames, asset import and broader
MCP preview/export remain follow-up work. Recovery counts above are historical.


## Acceptance and direction preparation

Original synthetic dense-text cases and measured browser tests extend the existing
single-card slice without changing its schema or acceptance authority. The
[constraint matrix](constraint-matrix.md) and [desktop directions](design-directions.md)
are consultation proposals. Print/special-frame, multi-card, production-policy
and comprehensive redesign rows above remain open. No execution tickets or
tracker migration are created by these documents.


## Approved A+C workbench

[Card workbench](workbench.md) implements the selected project/canvas/inspector
layout, before/after proposal review and visible stale-preview handling. This
does not resolve print profiles, production widow/repair policy, licensing,
tracker choice or multi-card/special-frame scope.
