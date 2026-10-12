# Design research handoff — sourced proposals

A parallel design researcher verified these references and supplied the findings
on 12 October 2026. This recovery pass did not duplicate its browser inspection.
Research is evidence for a later design discussion, not product approval.

| Source | Reported pattern | Candidate Artificer application |
| --- | --- | --- |
| [Canva Bulk Create](https://mobbin.com/flows/e7cf2952-1dcb-4fa9-a408-57c2bfd33d67) | Bulk data binding and explicit record selection | Bind fields to regions; preview selected records before generation |
| [Figma variants](https://mobbin.com/flows/096f5ca0-bc60-4748-bc44-eeb2e779cd35) | Named variants | Named frame/alternate-art variants with provenance |
| [Figma playground](https://mobbin.com/flows/f5eb4f9d-3a01-4b66-a90b-1db4d7cdef73) | Nonmutating component playground | Experiment with frame/constraint changes before applying |
| [Version restore](https://mobbin.com/flows/577f3099-4ce3-4c2d-8cba-bfe5b38009e4) | Restore workflow | Reviewable batch diffs and undo |
| [Adobe Express inspector](https://mobbin.com/flows/85b85247-dc54-4131-9b78-67ff52cf4d5b) | Contextual inspector | Card/region-specific controls beside a canvas |
| [InDesign Preflight](https://helpx.adobe.com/indesign/desktop/print/preflight/configure-and-use-the-preflight-panel.html) | Live validation | Persistent diagnostics distinguishing not-run, warning, failure |
| [InDesign data merge](https://helpx.adobe.com/ie/indesign/desktop/automation-and-scripting/merge-data/merge-records.html) | Data-to-layout records | Linked data grid and contact sheet |
| [Parent overrides](https://helpx.adobe.com/in/indesign/desktop/create-and-organize-pages/create-and-manage-parent-pages/manage-parent-items.html) | Explicit inherited-item overrides | Template/variant/card exception provenance |

The researcher assumed “Open Design” refers to
[nexu-io/OpenDesign](https://github.com/nexu-io/open-design), with its
[official site](https://open-design.ai/official/). Confirm the intended project
before selecting it as a tool/dependency. Its documented artifact-first preview,
manual edits and MCP files do not establish card-constraint or print guarantees.

Proposed workflow: linked canvas/data grid/contact sheet, symbol registry,
explicit override provenance, revision-checked MCP mutations through the same
validation as the UI, and reviewable batch changes. No silent rules-text rewrite,
forbidden tiny type, or detached frame should be used to force validation to pass.
The exact repair freedoms and mutation authority remain decisions.

Print profiles must be provider-specific. The supplied
[Game Crafter guidance](https://help.thegamecrafter.com/article/39-templates)
requires RGB PNG/JPG, so a universal CMYK PDF promise would be inappropriate.
Choose the first real provider, accepted formats and fixtures before print design.


## Subsequent direct inspection

[Desktop design directions](design-directions.md) records six directly inspected
Mobbin screens and three inspected OpenDesign documentation examples. It separates
observations from Artificer proposals, and retains runtime/identity limitations.
See [constraint matrix](constraint-matrix.md) for checked provider examples; none
is selected as a production profile.
