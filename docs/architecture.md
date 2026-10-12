# Architecture: current slice and recovered intent

The current implementation is documented in [first-slice boundaries](first-slice.md).
It uses the approved portable JSON/owned-assets, rendered-text, shared constraints,
scoped Rust persistence, local MCP and editor acceptance/undo architecture.

The remaining sections describe the separately preserved original prototype and
historical plans; they are not an inventory of current source behavior.

## Original prototype at recovery

The recovered npm-workspace repository contained one SvelteKit application in
`app/`. Svelte components directly render hard-coded demo card props. There is
no persistent domain model, API, or renderer service. Tailwind controls sizing
and layout. Tauri packages a shell; it does not implement storage. Effect is
exercised only by a greeting smoke module. Vitest has client/server projects;
Playwright checks a gallery card, and Storybook contains scaffold stories.

## Selected application direction

The owner selected desktop/local-first Tauri with Svelte/SvelteKit, dense TCG/LCG
cards first, and browser delivery later if viable. Compatible stable dependency
upgrades are authorized locally. See [upgrade matrix and sequence](upgrade.md).
The owner subsequently approved the bounded architecture in `first-slice.md`;
its implemented scope supersedes the earlier storage/MCP alternatives.

## Recovered future direction — confirmation pending

Source: `openspec/config.yaml` and the archived foundation proposal.

```text
cards/                 JSON card files (planned)
packages/core/         Effect schemas, loading, validation (planned)
apps/cli/              CLI using shared core (planned)
apps/mcp/              MCP tools using shared core (planned)
app/                   existing UI, planned editor and /render/[id]
```

Historical notes propose template references plus data, `schemaVersion` and lazy
migrations, monotonic `revision` and 409 conflicts, disk/UI synchronization,
and one Svelte renderer shared by preview and Playwright batch export. These
are recovered choices, **not implemented features or fresh approvals**. The
workspace layout is illustrative historical intent, not an instruction to move
files. MCP transport, tool schema, allowed filesystem boundary, asset resolution,
validation severity, reproducible rendering and template trust are unresolved.

The historical module layout was not adopted wholesale. The selected first-slice
architecture is recorded above; broader migration, rendering/export and deployment
choices still require a scoped design discussion.

## Print inconsistency requiring resolution

The Morph template is `w-[1050px] aspect-[63/88]`, giving approximately
1050 × 1466.67 CSS pixels. Notes say 1050 × 1470 at 300 DPI for 2.5 × 3.5 inches.
At 300 DPI, that physical trim size requires **750 × 1050 output pixels**;
1050 × 1470 would correspond to 420 DPI at that trim size. CSS pixels alone do
not set exported pixel resolution or DPI metadata. Bleed, safe area, device scale,
rounding, color profile and PDF/image requirements need explicit profiles.
Do not treat the recovered prototype dimensions as a validated print specification.
