# Pending decisions and design handoff

No broad redesign or product architecture implementation begins until findings
and direction are discussed. Proposed sequence: confirm recovery/bootstrap and
product constraints; settle architecture and tracker roles; develop a design
brief; implement one constrained human/agent slice through reviewed PRs.

1. **Bootstrap — resolved:** owner approved the reviewed documentation-only
   public baseline; published commit 370ca99. Subsequent integration uses PRs.
2. **Application direction — selected:** desktop/local-first Tauri; browser
   later if viable. Compatible stable Svelte/SvelteKit/Tauri upgrades are
   authorized. Historical storage/core/MCP architecture remains unconfirmed.
3. **First workflow — selected:** dense TCG/LCG cards. Real acceptance cards
   and exact frames still need selection.
4. **Constraint authority:** which violations reject writes/exports, which warn,
   and which allow named human-approved exceptions? Define widow and fit policy.
5. **Print profile:** physical trim, bleed/safe area, DPI, units, raster/PDF,
   color and printer specifications? Existing pixel/DPI notes are inconsistent.
6. **Tracker:** GitHub issues, Paperclip, or linked responsibilities? Preserve
   existing records and create no duplicate execution graph before deciding.
7. **MCP scope:** local project-only files or a broader asset library; transport,
   tool surface, trust boundary and override authority? No credentials/permissions
   or network service are implied.
8. **Publication/license:** documentation-only public scope is approved;
   decide its license. Source/sample publication and licensing remain separate.
9. **Design direction:** confirm application personality separately from card
   frame aesthetics. Existing PRODUCT/DESIGN hypotheses remain provisional.

## Design research inputs — not product decisions

See [the sourced research handoff](design-research.md) for verified references
supplied by the parallel researcher. Open Design's exact project identity remains
an assumption pending confirmation. Use research after the first fixture,
constraint policy and publication scope are confirmed. Existing Impeccable
discipline applies when UI/card output changes. This draft changes no UI/template.
