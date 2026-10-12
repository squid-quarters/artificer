# Product requirements and constraint proposal

## Current user direction

Artificer serves designers of TCGs, LCGs, board games, Tarot and general cards.
MCP is core: AI agents author cards within explicit constraints. These include
text fit and widows, consistent symbol placement across types, intentional
alternate-art exceptions, bleed and print output, and special frames. Human and
agent workflows need to preserve designer intent. A comprehensive redesign using
Mobbin and Open Design follows discovery and direction discussion.

Desktop/local-first Tauri is selected; browser delivery is later feasibility
work. Dense TCG/LCG cards lead the first workflow. The precise fixture cards,
constraint policies and output provider remain open.

## Proposed acceptance framework — not implemented or approved

| Requirement | Proposed observable behavior | Unanswered policy |
| --- | --- | --- |
| Text fit | Validate rendered text against named template regions with the selected fonts/assets | Reject, warn, resize or require override? Minimum font size and wrapping rules? |
| Widows | Report problematic final lines with region and preview evidence | Definition: one word, minimum characters, or language-specific rule? |
| Symbols | Reusable anchors/alignment rules shared across card types | Which anchors are invariant; can types opt out? |
| Alternate art | Named, auditable exceptions rather than unexplained divergence | Who can approve; what may differ? |
| Bleed/print | Profile states trim, bleed, safe area, DPI, output and preflight | Printer profile, units, color, PDF or raster output? |
| Special frames | Frame-specific regions and constraints with preview/validation | Which frames and fixtures lead the first slice? |
| MCP | Discover constraints, author/update, validate, preview and export under explicit scope | Tool contract, transport, filesystem boundary, mutation and override policy? |

A proposed golden fixture set pairs ordinary cards, long rules text, troublesome
widows, symbol-bearing variants, approved alternate art, edge-to-edge bleed and
special frames. Agent and human changes should yield the same validated output.
Before implementation, specify expected results, error/warning severity, permitted
exceptions and rendering environment. No automatic font shrinking, rule bypass,
or print-profile default is selected by this document.
