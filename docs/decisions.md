# Pending decisions and design handoff

Recovery and the first-slice architecture have been discussed and approved.
The clean single-card implementation is recorded in `first-slice.md`. Broad
redesign, tracker selection and unresolved production constraints still need
direction; those choices are not implied by the neutral fixture.

1. **Bootstrap — resolved:** owner approved the reviewed documentation-only
   public baseline; published commit 370ca99. Subsequent integration uses PRs.
2. **Application direction — selected:** desktop/local-first Tauri; browser
   later if viable. Compatible stable Svelte/SvelteKit/Tauri upgrades are
   authorized. Portable JSON/owned-assets, actual rendered measurement, shared constraint
   registry, scoped Rust persistence and local stdio MCP/undo are approved.
3. **First workflow — selected:** dense TCG/LCG cards. Real acceptance cards
   and exact frames still need selection.
4. **Constraint authority:** which violations reject writes/exports, which warn,
   and which allow named human-approved exceptions? Define widow and fit policy.
5. **Print profile:** physical trim, bleed/safe area, DPI, units, raster/PDF,
   color and printer specifications? Existing pixel/DPI notes are inconsistent.
6. **Tracker:** GitHub issues, Paperclip, or linked responsibilities? Preserve
   existing records and create no duplicate execution graph before deciding.
7. **MCP scope — initial selection:** local stdio, one explicitly selected root,
   constrained pending proposals and editor acceptance. Broader libraries,
   preview/export tools and override authority remain open. No network service
   or credentials are implied.
8. **Publication/license:** documentation-only public scope is approved;
   decide its license. Clean source with original neutral fixtures is approved through reviewed PRs.
   Original prototype/sample publication and project licensing remain separate.
9. **Design direction — selected:** A card workbench plus C proposal-review
   treatment is approved and implemented within single-card scope. Card frame
   aesthetics and broader workflow remain separate; see `workbench.md`.

## Design research inputs — not product decisions

See [the sourced research handoff](design-research.md) for verified references
supplied by the parallel researcher. Open Design's exact project identity remains
an assumption pending confirmation. Use research after the first fixture,
constraint policy and publication scope are confirmed. The recovered Impeccable references are historical context; its bundled skill
is excluded. The neutral fixture does not settle the comprehensive design brief.
