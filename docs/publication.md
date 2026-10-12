# Publication candidate and remaining licensing decisions

This candidate contains documentation only. It excludes application source,
sample assets, dependencies, bundled skills and executable tooling. It uses
fresh history without the source preservation snapshot as an ancestor. Original
source and preservation copies remain unchanged and separately retained.

The destination [repository](https://github.com/squid-quarters/artificer) is
public. Bootstrap/publication approval is pending. Nothing has been pushed;
no visibility or permission change is part of this candidate. Documentation
publication does not authorize source or asset publication.

## Asset inventory in the preserved prototype

These paths identify excluded files, not included candidate assets.

| Group | Files | Available provenance |
| --- | --- | --- |
| `app/static/` | 12: eight card images, three textures, favicon | No source URLs, attribution or asset licenses found |
| `app/src/stories/assets/` | 16 Storybook images/SVGs | Used by Storybook scaffold; no exact upstream copy or asset-license evidence established |
| `app/src-tauri/icons/` | 16 desktop icon files | Referenced by Tauri config; no source/ownership evidence found |
| `kill.png` | One root image | No source/ownership evidence found |

All **45 files** remain excluded. No asset source is inferred from its filename
or visual appearance. PNG metadata supplied no licensing evidence; one file
contains creation/modification dates only. Before source/assets are published,
obtain exact origins and applicable notices or agree replacements/omissions.

The preserved root package declares ISC without a project LICENSE file. The
Tauri package license field is empty. Decide the license for project source and
new documentation explicitly; this candidate declares no inferred project license.

The excluded Impeccable skill declares Apache 2.0 and references an absent
`NOTICE.md`. Resolve its attribution/notice before redistributing it. None of
its code, scripts or reference content is included in this candidate.

## Dependency evidence for later source publication

The preserved npm lock contains 456 non-workspace package entries with license
metadata. Direct dependencies mostly declare MIT; Playwright and TypeScript
Apache-2.0; Tauri CLI Apache-2.0 OR MIT. Crimson Text's installed package includes
an OFL-1.1 license, and Lightning CSS includes MPL-2.0 license text. Some installed
Storybook packages declare MIT without a root license file. These declarations
do not establish licenses for the copied samples.

Exact locked Rust dependency licenses were not established from available cache
versions. A future source/distribution review must resolve applicable notices
for the actual shipped packages and assets. No dependency binaries, font files,
lockfiles or manifests are included in this documentation candidate.
