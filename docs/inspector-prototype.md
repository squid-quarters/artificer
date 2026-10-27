# Read-only constraint and evidence inspector prototype

The owner approved this next slice within the selected A+C workbench. The local
`/inspector` route is a reviewable interaction sketch using the existing neutral
card, application palette, renderer, measurement function and keyboard panning.
The project editor at `/` is unchanged. No new template, print profile, dependency,
MCP authority or project mutation path is introduced.

## Explore locally

Use the pinned runtime and prerequisites in [local quality](local-quality.md).
Build with `npm run build -w app`, then serve only on loopback:

```sh
npm run preview -w app -- --host 127.0.0.1 --port 4341 --strictPort
```

Visit `http://127.0.0.1:4341/inspector`. Region buttons and diagnostic links select
inherited title/body/symbol details. A sibling overlay marks the declared region
or shared symbol anchor without changing the measured card. Compare mode keeps
current and frozen proposed examples separately labelled. The fixed-size canvas
scrolls with focus and unmodified arrows; narrow screens stack the panels.

## Evidence and authority

Six in-memory examples cover pass, body overflow, the explicit fixture widow
rule, unavailable required-font evidence, a stale proposal and a legacy title.
The font example deliberately supplies a local font-family mismatch. It does not
represent a failed installation or change the shared font set. Legacy templates
remain unbounded for title checks; the footer and print output remain unchecked.

Reports come from actual local DOM measurement, not mocked width estimates.
They are never registered with the backend or usable for acceptance. The route
imports no command bridge and offers no save, accept, undo, file-open or export
controls. It reads bundled fixture data and keeps only demonstration choices in
memory; it does not use browser persistence. Closing the page discards them.

Declared rules are distinct from report findings. Missing findings do not create
independent region passes. Font failures show layout as unmeasured and hide line
counts. Stale evidence is tied to frozen base revision 1, while the current
example shows revision 2; its counts are hidden and its report is unusable.
The source fixture hash and the measured in-memory snapshot hash are separately
labelled. Neither is issued as live project identity. Generation guards prevent
late measurements from appearing under a different selected example.

## Review boundary

Headless tests cover all six states, authority absence, unchanged fixture bytes,
overlay/compare geometry invariance, stale asynchronous results and narrow-screen
keyboard panning. This sketch does not claim native WKWebView or screen-reader
certification. Integration into the real inspector is a later scoped step after
review of this local prototype. Signing, publication, hosted CI and deployment
remain separate approvals; a local gate pass grants none of them.
