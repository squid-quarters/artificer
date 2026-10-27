<script lang="ts">
  import { onMount, tick } from 'svelte';
  import DenseCard from '#lib/dense-card.svelte';
  import { measure } from '#lib/measure.ts';
  import { scrollRegion } from '#lib/workbench/scroll-region.ts';
  import type { Project, Validation } from '#lib/model.ts';
  import rawProject from '../../../../fixtures/neutral-project/project.artificer.json?raw';
  import grid from '../../../../fixtures/neutral-project/assets/grid.svg?raw';
  import catalog from '../../../../fixtures/dense-cases.json';

  type Scenario = 'passing' | 'overflow' | 'widow' | 'font' | 'stale' | 'legacy';
  type Region = 'title' | 'body' | 'symbol';
  const scenarios: {id: Scenario; label: string; detail: string}[] = [
    {id:'passing',label:'Passing preview',detail:'Brief rules within declared bounds'},
    {id:'overflow',label:'Body overflow',detail:'Text preserved beyond the body box'},
    {id:'widow',label:'Final-line failure',detail:'Explicit two-word fixture rule'},
    {id:'font',label:'Unavailable font',detail:'Controlled required-font mismatch'},
    {id:'stale',label:'Stale proposal',detail:'Frozen revision 1; current example revision 2'},
    {id:'legacy',label:'Legacy title',detail:'Title has no declared bounds'},
  ];
  const art = `data:image/svg+xml,${encodeURIComponent(grid)}`;
  function example(id: Scenario): Project {
    const p = JSON.parse(rawProject) as Project;
    const key = id === 'overflow' ? 'vertical-overflow' : id === 'widow' ? 'explicit-widow' : 'short-fit';
    const source = catalog.cases.find(c => c.id === key)!;
    p.cards[0].body = source.body;
    if (id === 'stale') p.cards[0].title = 'Pending Focus';
    if (id === 'legacy') {
      delete p.templates[0].titleRegion;
      delete p.templates[0].titleFontPx;
      delete p.templates[0].titleLineHeightPx;
    }
    return p;
  }
  let scenario = $state<Scenario>('passing');
  let region = $state<Region>('body');
  let compare = $state(false);
  let highlight = $state(true);
  let busy = $state(true);
  let error = $state('');
  let fixtureHash = $state('');
  let bodyRef = $state<HTMLElement>();
  let report = $state<Validation>();
  let reportIdentity = $state<{scenario: Scenario; snapshotHash: string}>();
  let regionHeading = $state<HTMLElement>();
  let generation = 0;
  const proposed = $derived(example(scenario));
  const template = $derived(proposed.templates[0]);
  const current = $derived.by(() => {
    const p = example('passing');
    if (scenario === 'stale') { p.revision = 2; p.cards[0].title = 'Saved Focus'; }
    return p;
  });
  const evidenceStatus = $derived(scenario === 'stale' ? 'stale' : report?.status ?? 'not-run');
  const noLayout = $derived(report?.diagnostics.some(d => d.code === 'font-unavailable') ?? false);
  const showCounts = $derived(!!report && !busy && !noLayout && scenario !== 'stale');
  const selectedBounds = $derived(region === 'body' ? template.body : region === 'title' ? template.titleRegion : undefined);
  const findings = $derived(report?.diagnostics.filter(d => d.regionId === region) ?? []);

  async function choose(id: Scenario) {
    const token = ++generation;
    scenario = id; report = undefined; reportIdentity = undefined; busy = true; error = '';
    await tick();
    const target = bodyRef;
    const rules = template;
    const snapshot = JSON.stringify(proposed);
    try {
      if (!target) throw new Error('Preview is not ready');
      const measured = await measure(target, rules);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
      if (token === generation) {
        report = measured;
        reportIdentity = { scenario: id, snapshotHash: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('') };
      }
    } catch (e) {
      if (token === generation) error = String(e);
    } finally { if (token === generation) busy = false; }
  }
  async function focusRegion(id: string) {
    if (id !== 'title' && id !== 'body' && id !== 'symbol') return;
    region = id;
    await tick(); regionHeading?.focus();
  }
  onMount(() => {
    void crypto.subtle.digest('SHA-256',new TextEncoder().encode(rawProject)).then(bytes => {
      fixtureHash = Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
    });
    void choose('passing');
    return () => { generation++; };
  });
</script>

<svelte:head><title>Artificer · read-only inspector prototype</title></svelte:head>
<a class="skip-link" href="#inspector-main">Skip to inspector preview</a>
<header class="app-header">
  <div class="brand"><span class="brand-mark" aria-hidden="true">◆</span><h1>Artificer</h1><span class="app-kind">Constraint inspector</span></div>
  <span class="prototype-tag">Read-only prototype</span>
</header>
<div class="demo-notice" role="note">Original neutral fixture · local DOM measurements · no project opened, saved or recorded for acceptance.</div>
<div class="workspace inspector-demo">
  <aside class="context" aria-label="Example scenarios">
    <div class="context-section"><p class="eyebrow">Explore the inspector</p><h2>One card, six states</h2><p class="hint">Choose an example. Only this demonstration changes.</p></div>
    <div class="scenario-list" role="group" aria-label="Preview scenario">
      {#each scenarios as item}<button class="scenario" class:chosen={scenario === item.id} aria-pressed={scenario === item.id} onclick={() => choose(item.id)}><strong>{item.label}</strong><small>{item.detail}</small></button>{/each}
    </div>
    <div class="context-section scope"><p class="eyebrow">Scope stays visible</p><p>One card · inherited rules<br />Footer unchecked<br />Print unavailable</p><p class="hint">Selection and highlighting do not edit the card or its template.</p></div>
  </aside>
  <main id="inspector-main" tabindex="-1" class="main-workspace">
    <div class="canvas-toolbar"><div><p class="eyebrow">Local example proposal</p><h2>Inspect the rule beside the card</h2></div><button class="quiet small" aria-pressed={compare} onclick={() => compare = !compare}>Compare current and proposed</button></div>
    <div class="snapshot-bar"><span>demo-{scenario} · base revision 1</span><span>{scenario === 'stale' ? 'Current example: revision 2' : 'Current example: revision 1'}</span></div>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Fixed-size preview needs focused keyboard panning.) -->
    <div class="canvas demo-canvas" role="region" aria-label="Read-only card canvas" tabindex="0" onkeydown={scrollRegion}>
      <div class="proofs">
        {#if compare}<section class="example-proof" aria-label="Current example card"><div class="proof-caption"><strong>Current example</strong><span>Revision {current.revision}</span></div><DenseCard card={current.cards[0]} template={current.templates[0]} {art} /></section>{/if}
        <section class="example-proof" aria-label="Frozen proposed example" data-testid="inspector-proposed">
          <div class="proof-caption"><strong>Proposed example</strong><span>Frozen base revision 1</span></div>
          <div class="proof-paper" class:font-demo={scenario === 'font'}>
            <DenseCard card={proposed.cards[0]} {template} {art} bind:bodyRef />
            {#if highlight && selectedBounds}<div class="region-outline" data-testid="region-overlay" aria-hidden="true" style:left={`${selectedBounds.x+2}px`} style:top={`${selectedBounds.y+2}px`} style:width={`${selectedBounds.width}px`} style:height={`${selectedBounds.height}px`}><span>{region} · declared region</span></div>
            {:else if highlight && region === 'symbol'}<div class="anchor-mark" data-testid="anchor-overlay" aria-hidden="true" style:left={`${template.symbol.x+2}px`} style:top={`${template.symbol.y+2}px`}><span>Shared anchor</span></div>{/if}
          </div>
        </section>
      </div>
    </div>
    <section class="diagnostics" aria-labelledby="local-evidence-title" aria-busy={busy}>
      <div class="diagnostics-heading"><h2 id="local-evidence-title">Local preview evidence</h2><span class="validation" class:passing={evidenceStatus === 'pass' && !busy} class:failing={evidenceStatus === 'fail' && !busy} data-testid="inspector-status" data-status={busy ? 'not-run' : evidenceStatus} aria-live="polite">{busy ? 'Measuring local preview…' : evidenceStatus === 'stale' ? 'Stale example' : report ? `Local preview ${report.status}` : 'Not measured'}</span></div>
      {#if error}<p role="alert">{error}</p>{/if}
      {#if scenario === 'stale'}<div class="stale-note"><strong>Evidence belongs to frozen revision 1.</strong><p>The current example is revision 2. A fresh proposal and measured preview would be required in the editor.</p></div>
      {:else if noLayout}<p data-testid="unmeasured-note">Layout not measured. This example uses a controlled font-family mismatch to demonstrate unavailable required-font evidence.</p>{/if}
      {#if showCounts}<div class="check-summary" data-testid="local-counts"><span>{report!.lineCount} rendered body lines</span><span>{report!.finalLineWords} final-line words</span><span>Actual local DOM</span></div>{/if}
      {#if report && scenario !== 'stale' && report.diagnostics.length}<ul class="local-findings">{#each report.diagnostics as diagnostic}<li><button class="quiet small" onclick={() => focusRegion(diagnostic.regionId)}>Inspect {diagnostic.regionId}</button><div><strong>{diagnostic.code}</strong><p>{diagnostic.message}</p></div></li>{/each}</ul>{/if}
      <p class="scope-note">This report is not registered with an editor session. Acceptance is unavailable in this prototype. {scenario === 'legacy' ? 'Legacy title and footer are not preflighted.' : 'Footer and print output are not preflighted.'}</p>
    </section>
  </main>
  <aside class="inspector" aria-label="Read-only constraints and evidence">
    <div class="context-section"><p class="eyebrow">Frozen proposal snapshot</p><h2>Constraints &amp; evidence</h2><p class="hint">Template {template.id} · demo-{scenario} · base revision 1</p><details><summary>Fixture identity</summary><p class="hash-label">SHA-256 of original fixture bytes</p><code class="hash" data-testid="source-fixture-hash">{fixtureHash || 'Calculating…'}</code><p class="hash-label">Measured example snapshot · serialized in memory</p><code class="hash" data-testid="example-snapshot-hash">{reportIdentity?.snapshotHash ?? 'Not measured for this selection'}</code><p class="hint">{reportIdentity ? `demo-${reportIdentity.scenario} · base revision 1` : 'Measurement pending'}. No live project identity or acceptance proof is issued.</p></details></div>
    <div class="region-picker" role="group" aria-label="Inspect region">{#each ['title','body','symbol'] as id}<button aria-pressed={region === id} class:chosen={region === id} onclick={() => region = id as Region}>{id === 'title' ? 'Title' : id === 'body' ? 'Body' : 'Symbol'}</button>{/each}</div>
    <div class="region-detail"><div class="section-heading"><h3 bind:this={regionHeading} tabindex="-1">{region === 'body' ? 'Rules text' : region === 'title' ? 'Card title' : 'Shared symbol'}</h3><span class="declared-tag">Inherited</span></div>
      {#if selectedBounds}<dl><div><dt>Position</dt><dd>{selectedBounds.x}, {selectedBounds.y} logical px</dd></div><div><dt>Region</dt><dd>{selectedBounds.width} × {selectedBounds.height} logical px</dd></div></dl>{/if}
      {#if region === 'body'}<dl><div><dt>Declared type</dt><dd>Crimson Text · normal 400 · {template.fontPx}px</dd></div><div><dt>Minimum</dt><dd>{template.minFontPx}px · no automatic shrinking</dd></div><div><dt>Final-line rule</dt><dd>{template.lastLineMinWords === null ? 'Disabled in this template' : `${template.lastLineMinWords} words minimum on multi-line text`}</dd></div></dl>
      {:else if region === 'title'}{#if template.titleRegion}<dl><div><dt>Declared type</dt><dd>Crimson Text · normal 700 · {template.titleFontPx}px</dd></div><div><dt>Line height</dt><dd>{template.titleLineHeightPx}px</dd></div><div><dt>Fit policy</dt><dd>Overflow and reserved-region overlap reject acceptance</dd></div></dl>{:else}<p class="legacy-note">No declared title bounds. Title fit is unchecked and title editing is unavailable.</p>{/if}
      {:else}<dl><div><dt>Registry entry</dt><dd>{template.symbol.id} · {template.symbol.glyph}</dd></div><div><dt>Shared anchor</dt><dd>{template.symbol.x}, {template.symbol.y} logical px</dd></div><div><dt>Named variants</dt><dd>{template.variants.map(v => v.id).join(', ')}</dd></div></dl><p class="hint">An anchor is a position, not a declared glyph bounding box. Named art variants retain this shared anchor.</p>{/if}
      <button class="quiet small" aria-pressed={highlight} onclick={() => highlight = !highlight}>{highlight ? 'Hide region highlight' : 'Show region highlight'}</button>
      <section class="region-evidence" aria-labelledby="region-evidence-title"><p class="eyebrow">Reported evidence</p><h4 id="region-evidence-title">{scenario === 'stale' ? 'Frozen report is stale' : region === 'title' && !template.titleRegion ? 'Title not checked' : noLayout ? 'Layout not measured' : busy ? 'Measurement pending' : !report ? 'Report unavailable' : findings.length ? 'Reported finding' : 'No reported finding'}</h4>
        {#if scenario === 'stale'}<p class="hint">Constraints shown here belong to the frozen proposal, not the current example.</p>{:else if findings.length}<ul>{#each findings as finding}<li>{finding.message}</li>{/each}</ul>{:else}<p class="hint">Region details are part of the aggregate report. No separate per-region pass is issued.</p>{/if}
      </section>
    </div>
  </aside>
</div>

<style>
  .app-header {height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 24px;border-bottom:1px solid var(--line);background:var(--panel);}
  .brand {display:flex;align-items:center;gap:12px;}.brand h1 {margin:0;font-size:19px;font-weight:650;letter-spacing:-.6px;}
  .brand-mark {display:grid;place-items:center;width:28px;height:34px;border:1.5px solid var(--ink);border-radius:4px;font-size:13px;transform:rotate(-7deg);}.app-kind {font-size:12px;color:var(--ink-secondary);padding-left:14px;border-left:1px solid var(--line);}
  .context {border-right:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;min-width:0;}
  .context-section {padding:20px 18px;border-bottom:1px solid var(--line);}.context-section h2 {font-size:17px;font-weight:550;margin:8px 0;}
  .eyebrow {font-size:10px;font-weight:650;letter-spacing:1.1px;text-transform:uppercase;color:var(--ink-secondary);margin:0 0 8px;}.hint {font-size:12px;line-height:1.7;color:var(--ink-secondary);margin:10px 0 0;}
  .main-workspace {display:flex;flex-direction:column;min-width:0;background:var(--canvas);}
  .canvas-toolbar {display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 26px;}.canvas-toolbar h2 {font-size:18px;line-height:1.4;margin:0;font-weight:550;}
  .snapshot-bar {margin:0 26px;}
  .canvas {overflow:auto;min-width:0;flex:1;padding:16px 26px 30px;background-image:radial-gradient(#afb4a844 .75px,transparent .75px);background-size:16px 16px;}
  .diagnostics {padding:20px 26px;border-top:1px solid var(--line);background:var(--panel);}.diagnostics-heading {display:flex;align-items:center;justify-content:space-between;gap:12px;}.diagnostics h2 {font-size:14px;margin:0;}
  .validation {font-size:11px;border:1px solid var(--line);border-radius:4px;padding:5px 8px;color:var(--ink-secondary);}.validation.passing {color:#345227;background:var(--accent-soft);border-color:#c3cdb6;}.validation.failing {color:#882e24;background:#faeee9;border-color:#e5c6bc;}
  .check-summary {display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:var(--ink-secondary);}.scope-note {font-size:11px;line-height:1.7;color:var(--ink-secondary);margin:14px 0 0;}
  .inspector {border-left:1px solid var(--line);background:var(--panel);min-width:0;}.section-heading {display:flex;align-items:center;justify-content:space-between;gap:10px;}

  .prototype-tag,.declared-tag {border:1px solid var(--line);border-radius:5px;padding:5px 9px;font-size:12px;color:var(--ink-secondary);white-space:nowrap;}
  .demo-notice {padding:10px 24px;border-bottom:1px solid var(--line);font-size:13px;color:var(--ink-secondary);background:var(--surface);}
  .inspector-demo {display:grid;grid-template-columns:216px minmax(390px,1fr) 344px;min-height:calc(100vh - 113px);}
  .scenario-list {padding:0 12px;display:grid;gap:5px;}
  .scenario {text-align:left;padding:12px;background:transparent;border:1px solid transparent;border-radius:6px;display:grid;gap:5px;}
  .scenario small {font-size:12px;color:var(--ink-secondary);line-height:1.5;}
  .chosen {background:var(--accent-soft);border-color:#aebfa2;color:var(--accent);}
  .scope {margin-top:24px;line-height:1.8;font-size:13px;}
  .snapshot-bar {display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 0;color:var(--ink-secondary);font-size:12px;}
  .demo-canvas {min-height:570px;}
  .proofs {display:flex;gap:32px;min-width:max-content;padding:10px 4px;}
  .example-proof {flex:0 0 auto;}
  .proof-caption {display:flex;justify-content:space-between;gap:12px;font-size:12px;margin-bottom:14px;color:var(--ink-secondary);}
  .proof-caption strong {color:var(--ink);}
  .proof-paper {position:relative;width:360px;height:500px;box-shadow:0 2px 3px #27282012,0 12px 30px #27282016;}
  .font-demo :global([data-testid="card-body"]) {font-family:serif;}
  .region-outline {position:absolute;pointer-events:none;border:2px solid #537344;background:#5d884709;z-index:1;}
  .region-outline span,.anchor-mark span {position:absolute;top:-23px;left:-2px;background:#36552d;color:#fff;font:11px/1.5 system-ui;padding:2px 6px;white-space:nowrap;border-radius:3px;}
  .anchor-mark {position:absolute;width:18px;height:18px;border:1px solid #537344;transform:translate(-50%,-50%);pointer-events:none;}
  .anchor-mark::before,.anchor-mark::after {content:'';position:absolute;background:#36552d;}
  .anchor-mark::before {left:8px;top:-5px;width:1px;height:26px;}
  .anchor-mark::after {left:-5px;top:8px;width:26px;height:1px;}
  .anchor-mark span {left:-45px;}
  .local-findings {padding:0;list-style:none;display:grid;gap:12px;}
  .local-findings li {display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--panel);border:1px solid var(--line);border-radius:6px;}
  .local-findings strong {font-size:13px;}.local-findings p {font-size:13px;line-height:1.6;margin:4px 0 0;}
  .stale-note {border-left:3px solid #af8b45;padding:10px 14px;background:#f4efe3;font-size:13px;line-height:1.6;}
  .stale-note p {margin:5px 0;}
  .inspector h2 {font-size:19px;margin:6px 0 10px;}
  details {font-size:12px;margin-top:18px;} summary {cursor:pointer;color:var(--ink-secondary);}
  .hash {display:block;overflow-wrap:anywhere;font-size:11px;line-height:1.7;}
  .hash-label {font-size:11px;color:var(--ink-secondary);margin-bottom:4px;}
  .region-picker {display:flex;padding:0 22px;gap:6px;}
  .region-picker button {flex:1;padding:8px;font-size:13px;border:1px solid var(--line);border-radius:5px;}
  .region-detail {padding:24px 22px;}.region-detail h3 {font-size:17px;margin:0;}
  dl {font-size:13px;margin:18px 0;}dl div {border-bottom:1px solid var(--line);padding:10px 0;}dt {color:var(--ink-secondary);font-size:12px;margin-bottom:4px;}dd {margin:0;line-height:1.6;}
  .region-evidence {border-top:1px solid var(--line);margin-top:24px;padding-top:20px;}.region-evidence h4 {font-size:14px;margin:8px 0;}.region-evidence ul {padding-left:18px;font-size:13px;line-height:1.7;}
  .legacy-note {padding:12px;background:var(--surface);line-height:1.7;font-size:13px;}
  @media(max-width:1050px) {.inspector-demo {grid-template-columns:200px minmax(0,1fr);}.inspector {grid-column:1/-1;border-top:1px solid var(--line);}.region-detail {max-width:650px;}}
  @media(max-width:650px) {.inspector-demo {display:block;}.scenario-list {grid-template-columns:1fr 1fr;}.scope {margin-top:12px;}.canvas-toolbar {align-items:flex-start;gap:14px;flex-direction:column;}.main-workspace {padding:18px 14px;}.demo-notice {padding:10px 16px;}.app-kind {display:none;}}
</style>
