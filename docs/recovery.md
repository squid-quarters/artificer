# Recovery evidence — 12 October 2026

## Verified identity and preservation

- Matching repository: [squid-quarters/artificer](https://github.com/squid-quarters/artificer).
  Its description is “Card layout software for card designers (card games).”
- [Former repository URL](https://github.com/gear-null/artificer) resolves to the
  same repository.
- GitHub metadata reports public, not archived, default branch `main`, size 0.
  The branches endpoint returned an empty list; there was no remote code.
- All-state issue and PR endpoints returned empty lists. Preserved counts:
  **0 open issues, 0 closed issues, 0 open PRs, 0 closed PRs**.
  [Issues](https://github.com/squid-quarters/artificer/issues) and
  [PRs](https://github.com/squid-quarters/artificer/pulls).
  Organization-wide Artificer issue/PR search returned no additional record.
- The original local checkout had an unborn `main`, all source untracked, no
  remote, refs or reflogs, and zero loose or packed Git objects. No older local
  Git history or unpushed ref was recoverable.
- The original prototype remains unchanged. A separate physical preservation
  copy and SHA-256 manifest cover 200 regular files. Eight IDE/generated files
  are preserved physically but omitted by Git ignore rules from the local source
  snapshot. The source snapshot's 193 tracked entries include one symlink.
  This preservation copy is not included in this candidate or its ancestry.

Current Paperclip discovery found no dedicated Artificer project or feature
issues and one completed administrative repository-retention cross-reference.
It supplies repository context, not a feature backlog. No records were migrated,
deleted, created, reassigned or changed. These results describe current
records, not proof that no deleted or external historical backlog ever existed.

## Concrete implementation in the separately preserved prototype

Paths below identify recovered source evidence. These files are **not included**
in this documentation-only candidate.

| Evidence path | Verified state |
| --- | --- |
| `app/src/lib/pages/Gallery/gallery.svelte` | Eight hard-coded Morph cards, six-column gallery, 30% CSS scale |
| `app/src/lib/morph/Card/card.svelte` | Type/subtype/image/body/footer props; fixed width and ratio; no fit rules |
| `app/src/lib/Card/card.svelte` | Second exploratory title/body/footer card template |
| `app/src/lib/Background/background.svelte` | Textured/flat background branches; no asset management workflow |
| `app/src/routes/+page.svelte` | Renders gallery; no editor controls |
| `app/src/lib/runtime/smoke.ts` | Effect greeting with tagged error; not card validation |
| `app/src-tauri/src/lib.rs` | Tauri shell/logging setup; no card filesystem commands |
| `app/svelte.config.js` | Static adapter with fallback |
| `app/src/routes/page.svelte.test.ts`, `app/e2e/demo.test.ts` | Gallery presence checks |
| `app/src/demo.spec.ts`, `app/src/lib/runtime/smoke.spec.ts` | Scaffold and Effect smoke tests |

Absent: card schema/store, `cards/`, `/render/[id]`, file watcher, revision
conflicts, editor, CLI, MCP, image/sheet export, text-fit/widow analysis, symbol
anchors, alternate-art exceptions, special-frame constraints, bleed/print preflight.

## Recovered requirements provenance

The preserved `openspec/config.yaml` records phases 0–5 and labels JSON-file
storage, Effect schemas, shared Svelte rendering, bidirectional WYSIWYG, revision
locking, lazy migrations, CLI and MCP as decided. The only archived change is
`2026-05-25-foundation-voidzero-and-effect`, containing proposal, design, tasks,
and migration notes. Checked tasks report a successful foundation upgrade and
a +45.6 KB gzip largest-chunk delta. The source has the matching stack/smoke
module but no later product-phase implementation. Original approval discussions
were not recovered, so those future choices remain historical proposals pending
confirmation.

Preserved `PRODUCT.md` and `DESIGN.md` are placeholders with provisional users,
craft-tool styling and anti-references. There is no completed design system or
confirmed visual direction. Historical design instructions reference Impeccable;
that bundled skill is excluded from this candidate.

Current requirements come from the project owner's recovery brief: designers of
TCGs, LCGs, board games, Tarot and general cards; core MCP authoring; explicit
fit/widow, shared-symbol, alternate-art, bleed/print and special-frame constraints;
and a later comprehensive redesign using Mobbin and Open Design. These are
requirements, while precise policies and implementation choices remain open.

Original feature backlog, real acceptance card files, production constraints,
and a completed design brief were not recovered. See [pending decisions](decisions.md)
and [verification scope](verification.md). No source or tracker change was made.
