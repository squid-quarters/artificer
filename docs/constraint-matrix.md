# Layout and print constraint matrix — proposal

This matrix is for consultation. Only the current-slice column describes
implemented behavior. Suggested severity and evidence are proposals; they are
not new defaults, printer specifications, schema fields or export promises.
Synthetic tests are documented in [dense acceptance](dense-acceptance.md).

| Constraint | Current slice | Proposed evidence and handling | Decision needed before expanding |
| --- | --- | --- | --- |
| Body fit | Actual DOM fragments; overflow rejects acceptance | Retain preview + named region + relevant bounds; reject clipping | Additional text regions, wrapping and any permitted fit repairs |
| Minimum font | Explicit template minimum; no automatic shrink | Reject declared minimum violations; show requested/actual size | Designer-approved minimum per template and physical profile |
| Widows | Explicit final-line word count or null; fixture failure rejects | Show final line and selected rule; exemptions must be named | Language, paragraph versus region scope, punctuation and rule severity |
| Shared symbols | One registry/anchor checked in both existing art variants | Cross-type alignment fixtures; fail unintended drift | Which anchors are invariants; how intentional exceptions are approved |
| Alternate art | Named art variant only; same gameplay/template/symbols | Surface changed visual fields and inherited values before acceptance | Which geometry changes may be intentionally excepted |
| Title/footer | Rendered but not measured | Add region diagnostics before claiming complete-card fit | Region boundaries, line limits and exception authority |
| Special frames | Not implemented | Explicit frame-specific regions and acceptance examples | First frame family and allowed inheritance/overrides |
| Stale proposal | Revision, content hash and exact preview identity checked | Keep rejection with a request to preview against the new revision | Batch/rebase semantics only if later authorized |
| Trim and bleed | Print profile null | Separate physical trim box, outside bleed and inside safe area; reject export if required profile absent | Provider/product/template revision, units and rounding |
| Resolution | Logical preview pixels only | Derive output pixels from approved physical size and target resolution | DPI, scale, raster dimensions and rounding; do not infer from CSS size |
| Safe content | No print preflight | Check essential text/symbols against approved safe box; show offending region | Safe inset and tolerance for selected product |
| Art coverage | Existing owned SVGs only | Check bleed coverage and raster effective resolution; fail missing/low-resolution sources where required | Asset import scope, crop policy and resolution threshold |
| Color and format | No export | Validate selected profile's file/color requirements and font handling | Raster/PDF, color space/ICC, embedding, transparency, compression |
| Front/back output | No export/imposition | Proof orientation, order, paired identifiers and guides exclusion | Single files, sheets or imposed output; registration tolerance |

## Provider evidence: examples only

These are independently checked public documentation on 12 October 2026, not
selected Artificer profiles. Exact product templates take precedence; numeric
examples below must not be copied into production defaults.

| Source | Documented example | Why profile selection matters |
| --- | --- | --- |
| [The Game Crafter templates](https://help.thegamecrafter.com/article/39-templates) | RGB PNG/JPG uploads; 300 pixels/inch; square-item guides describe cut/safe distances from the image edge and warn of drift | Do not promise universal CMYK PDF or infer safe inset from trim without checking the product template |
| [MakePlayingCards upload guide](https://www.makeplayingcards.com/pops/faq-photo.html) | Poker example: 2.5 × 3.5 inch trim, 822 × 1122 minimum upload pixels at 300 DPI; guide describes 36 pixels cut per side | Trim pixels and upload pixels differ; use its actual product/template definitions for safe-area interpretation |

Arithmetic example, not a selected profile: 2.5 × 3.5 inches at 300 pixels/inch
has 750 × 1050 trim pixels. The MPC upload example adds 72 pixels to each total
dimension. This does not select that provider, dimensions, bleed or safe zone
for Artificer. The recovered prototype's 1050 × 1470 claim cannot simultaneously
mean that trim size at 300 DPI.

## Focused choices

1. Which output should be the first acceptance target: screen-only preview,
   a specific provider/product/template, or a supplied printer specification?
   Print work needs the actual template/revision and output requirements.
2. For the first real dense template, which regions/rules are hard failures,
   warnings or named human exceptions? Define widow scope/language and permitted
   repairs. Initial acceptance still never rewrites rules text automatically.
3. Which special frame and intentional alternate-art geometry exception should
   be tested first, if those are the next priority? No schema expansion starts
   from an invented example.
