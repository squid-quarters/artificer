# Synthetic dense-card acceptance fixtures

This preparation extends tests, not the project schema, editor or MCP authority.
The [case catalog](../fixtures/dense-cases.json) contains original synthetic rules
text, titles and expected outcomes. It reuses the already published neutral
project/assets. It introduces no game-card copies, external screenshots, fonts,
art or print presets. No license is selected.

Each case runs in its own temporary, single-card project. The test sets the
existing template's explicit widow constraint offline, starts real Rust editor
and MCP processes, queues the body/variant through MCP, and measures it in the
actual Svelte preview. Rejected cases preserve project bytes; passing cases
require editor acceptance and advance the revision. All preserve the symbol
registry and unset print profile. The original end-to-end test still covers
conflict refusal, undo and reopen.

| Case | Synthetic scenario | Fixture expectation |
| --- | --- | --- |
| `short-fit` | Reserve Spark: brief rules | Pass with unchanged symbol anchor |
| `dense-fit` | Measured Exchange: two paragraphs of conditional rules | Pass at the existing logical preview size |
| `vertical-overflow` | Crowded Ledger: repeated rules beyond the body | Fail with overflow; no rewrite or save |
| `explicit-widow` | Last Word: one word on a second line | Fail with widow, without overflow, under explicit two-word rule |
| `widow-disabled` | Identical body with null widow rule | Pass; demonstrates no universal widow default |
| `alternate-art` | Same Reserve Spark gameplay with existing alternate art | Pass; variant changes but template and symbol registry remain |
| `unbroken-token` | Long Identifier: oversized unbroken token | Fail with overflow even when wrapping is enabled |

The catalog version belongs to test data only. It is not a project schema version
or a new import format. Titles are fixtures; title fit is not tested or claimed.
Expectations apply to the bundled Crimson Text, existing 360 × 500 logical-pixel
preview and Chromium acceptance environment. They do not establish native WebKit
parity, localization behavior, exact line-break stability across platforms or
whole-card print readiness.

## Next acceptance candidates — proposals, not implemented

Real designer-approved dense cards should eventually replace synthetic assumptions
as product acceptance evidence. Future cases include title/footer overflow,
inline symbols, cross-type anchors, intentional anchor exceptions, split/special
frames, bilingual text, font fallback, trim/bleed/safe-zone edges and front/back
alignment. These need approved rules and, where necessary, narrowly reviewed
schema work. No multi-card project or special-frame support is implied here.

For proposed policy and print evidence, read [constraint matrix](constraint-matrix.md).
For the application workspace choice, read [design directions](design-directions.md).


## Executed evidence

All seven catalog cases and the original end-to-end workflow pass (8/8) in
Chromium on macOS using the real Rust backend. Type checks, lint, formatting,
4 TypeScript tests and 11 native regressions pass. This follow-up changes only
fixture data, test code and documentation.


The later owner-approved [title extension](first-slice.md#approved-title-authoring-extension)
adds independent title-overflow and UI/MCP acceptance coverage. The historical
catalog above still targets body/variant behavior; its original execution record
is not a native keyboard or whole-card print claim.
