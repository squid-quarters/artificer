<script lang="ts">
  import { onMount, tick } from 'svelte';
  import CardProof from '#lib/workbench/card-proof.svelte';
  import ReviewDiff from '#lib/workbench/review-diff.svelte';
  import { bridge } from '#lib/bridge.ts';
  import { candidate, type Project, type Proposal, type Validation } from '#lib/model.ts';
  import { measure } from '#lib/measure.ts';
  import { scrollRegion } from '#lib/workbench/scroll-region.ts';

  let path = $state(''); let openedPath = $state(''); let showProjectForm = $state(true);
  let project = $state<Project>(); let preview = $state<Project>(); let before = $state<Project>();
  let proposals = $state<Proposal[]>([]); let selected = $state<Proposal>();
  let report = $state<Validation>(); let error = $state(''); let notice = $state('');
  let busy = $state(false); let conflict = $state(false); let compare = $state(false);
  let mode = $state<'edit' | 'review'>('edit'); let reviewHeading = $state<HTMLElement>();
  let canvasHeading = $state<HTMLElement>(); let bodyRef = $state<HTMLElement>();
  let art = $state(''); let beforeArt = $state(''); let draft = $state(''); let draftVariant = $state('');
  let operationVersion = 0; let polling = false; let mounted = false;
  const shown = $derived(preview ?? project);
  const card = $derived(shown?.cards[0]);
  const template = $derived(shown?.templates.find(t => t.id === card?.templateId));
  const pending = $derived(proposals.filter(p => p.status === 'pending'));
  const accepted = $derived(proposals.filter(p => p.status === 'accepted').sort((a,b) => (b.acceptedRevision ?? 0) - (a.acceptedRevision ?? 0)).slice(0, 5));
  const canAccept = $derived(!!selected && !!preview && report?.status === 'pass' && !busy && !conflict && !error);

  function identity(p: Proposal) { return JSON.stringify([p.id,p.expectedRevision,p.expectedProjectHash,p.cardId,p.body,p.variantId,p.kind,p.status,p.acceptedRevision]); }
  async function getArt(p: Project) {
    const c = p.cards[0]; const t = p.templates.find(t => t.id === c.templateId);
    const id = t?.variants.find(v => v.id === c.variantId)?.artAssetId;
    return id ? bridge.asset(id) : '';
  }
  async function guard(action: () => Promise<void>) {
    if (busy) return;
    operationVersion++; busy = true; error = ''; notice = '';
    try { await action(); } catch (e) {
      error = String(e); report = undefined;
      if (selected && /revision|conflict|changed/i.test(error)) conflict = true;
    } finally { busy = false; }
  }
  function clearReview() { preview = undefined; before = undefined; selected = undefined; report = undefined; conflict = false; compare = false; beforeArt = ''; }
  async function open() { await guard(async () => {
    project = undefined; openedPath = ''; clearReview(); proposals = []; art = ''; mode = 'edit';
    const opened = await bridge.open(path); const image = await getArt(opened);
    project = opened; openedPath = path; art = image; draft = opened.cards[0].body; draftVariant = opened.cards[0].variantId;
    proposals = await bridge.proposals(); showProjectForm = false; notice = 'Project opened. Changes stay pending until you accept them.';
  }); }
  async function previewProposal(proposal: Proposal) {
    clearReview(); mode = 'review';
    const current = await bridge.project(); const currentArt = await getArt(current);
    proposals = await bridge.proposals();
    project = current; before = current; beforeArt = currentArt; art = currentArt; selected = proposal;
    const next = candidate(current, proposal); preview = next; art = '';
    art = await getArt(next); await tick();
    if (!bodyRef || !template) throw new Error('Renderer not ready');
    const measured = await measure(bodyRef, template);
    await bridge.validate(proposal.id, current.revision, proposal, measured); report = measured;
    await tick(); reviewHeading?.focus();
  }
  async function inspect(proposal: Proposal) { await guard(() => previewProposal(proposal)); }
  async function editorPreview(kind: 'edit' | 'undo' = 'edit') { await guard(async () => {
    if (!project) return;
    const proposal = await bridge.propose(project.revision, project.cards[0].id, kind === 'edit' ? draft : null,
      kind === 'edit' && draftVariant !== project.cards[0].variantId ? draftVariant : null, kind);
    await previewProposal(proposal);
  }); }
  async function accept() {
    if (!canAccept || !selected || !project) return;
    const id = selected.id; const revision = project.revision;
    const matches = (p: Project | undefined) => !!p && draft === p.cards[0].body && draftVariant === p.cards[0].variantId;
    const retainDraft = !matches(before) && !matches(preview);
    await guard(async () => {
      const saved = await bridge.accept(id, revision); project = saved; clearReview();
      art = await getArt(saved); if (!retainDraft) { draft = saved.cards[0].body; draftVariant = saved.cards[0].variantId; }
      proposals = await bridge.proposals(); mode = 'edit'; notice = `Change accepted. Saved revision ${saved.revision}.${retainDraft ? " Your unsubmitted draft is retained; preview it against the new revision." : ""}`;
      await tick(); canvasHeading?.focus();
    });
  }
  async function showCurrent() { await guard(async () => {
    const current = await bridge.project(); const image = await getArt(current);
    project = current; clearReview(); art = image; mode = 'edit';
  }); }
  async function poll() {
    if (!mounted || !project || busy || polling) return;
    polling = true; const version = operationVersion;
    try {
      const latest = await bridge.project(); const queue = await bridge.proposals();
      const changed = latest.contentHash !== project.contentHash || latest.revision !== project.revision;
      const image = changed && !selected ? await getArt(latest) : undefined;
      if (!mounted || version !== operationVersion || busy) return;
      if (selected && (changed || !queue.some(p => identity(p) === identity(selected!)))) {
        if (!conflict) error = 'Project or proposal changed after this preview. Return to the current card before preparing a new change.';
        conflict = true; report = undefined;
      }
      if (changed && !selected) {
        const pristine = draft === project.cards[0].body && draftVariant === project.cards[0].variantId;
        if (pristine) { draft = latest.cards[0].body; draftVariant = latest.cards[0].variantId; }
        else notice = 'The saved card changed. Your draft has been kept; preview it against the new revision.';
        art = image ?? '';
      }
      project = latest; proposals = queue;
    } catch (e) {
      if (mounted && version === operationVersion && !busy) { error = String(e); report = undefined; }
    } finally { polling = false; }
  }
  onMount(() => { mounted = true; const timer = setInterval(poll, 750); return () => { mounted = false; clearInterval(timer); }; });
</script>

<svelte:head><title>Artificer · card workbench</title><meta name="description" content="A local card workbench with measured layout and explicit proposal review." /></svelte:head>
<a class="skip-link" href="#workspace-main">Skip to card workspace</a>
<header class="app-header">
  <div class="brand"><span class="brand-mark" aria-hidden="true">◆</span><h1>Artificer</h1><span class="app-kind">Card workbench</span></div>
  <div class="header-state"><span class="local-dot" aria-hidden="true"></span><span>Local project</span>{#if project}<span class="revision" data-testid="revision">Revision {project.revision}</span>{/if}</div>
</header>
<div class="workspace" aria-busy={busy}>
  <aside class="context" aria-label="Project and proposals">
    <div class="context-section project-context"><p class="eyebrow">Project</p><h2>{project?.label ?? 'Your local workspace'}</h2>
      {#if project}<p class="folder-name" title={openedPath}>{openedPath.split(/[\\/]/).filter(Boolean).at(-1)}</p>{/if}
      <button class="quiet small" onclick={() => showProjectForm = !showProjectForm} aria-expanded={showProjectForm} aria-controls="project-form" disabled={busy}>{project ? 'Change project' : 'Project folder'}</button>
      {#if showProjectForm}<form id="project-form" onsubmit={(e) => { e.preventDefault(); void open(); }}><label for="project-path">Project folder</label><input id="project-path" bind:value={path} placeholder="Path to your project" spellcheck="false" disabled={busy} required /><button class="primary" type="submit" disabled={busy}>Open project</button><p class="hint">Open a folder containing your Artificer project.</p></form>{/if}
    </div>
    {#if project}
      <div class="context-section"><div class="section-heading"><h2>Cards</h2><span class="count">1</span></div><nav aria-label="Project cards"><button class="card-item" onclick={showCurrent} aria-current={!selected ? 'true' : undefined} disabled={busy}><span class="mini-card" aria-hidden="true">◆</span><span><strong>{project.cards[0].title}</strong><small>{project.cards[0].variantId}</small></span></button></nav></div>
      <div class="context-section proposal-context"><div class="section-heading"><h2>Proposals</h2><span class="count" aria-label={`${pending.length} pending proposals`}>{pending.length}</span></div><p class="hint">Changes from you and your agent.</p>
        {#if pending.length === 0}<p class="empty-note">No pending changes.</p>{/if}
        {#each pending as proposal}<button class="proposal-item" class:selected={selected?.id === proposal.id} onclick={() => inspect(proposal)} disabled={busy} aria-pressed={selected?.id === proposal.id}><span class="proposal-dot" aria-hidden="true"></span><span><strong>Preview {proposal.id}</strong><small>{proposal.kind === 'undo' ? 'Undo proposal' : 'Card change'} · revision {proposal.expectedRevision}</small></span></button>{/each}
      </div>
      <div class="context-section history"><div class="section-heading"><h2>Recent acceptance</h2></div>{#if accepted.length === 0}<p class="empty-note">Accepted changes appear here.</p>{/if}{#each accepted as proposal}<div class="history-item"><span aria-hidden="true">✓</span><div><strong>{proposal.id}</strong><small>{proposal.kind === 'undo' ? 'Undo accepted' : 'Accepted'} · revision {proposal.acceptedRevision}</small></div></div>{/each}</div>
      <div class="context-footer"><span class="local-dot" aria-hidden="true"></span><p>One card · owned assets<br />Print profile unset</p></div>
    {/if}
  </aside>

  <main id="workspace-main" tabindex="-1" class="main-workspace">
    <div class="canvas-toolbar"><div><p class="eyebrow">{selected ? 'Proposal preview' : 'Card preview'}</p><h2 bind:this={canvasHeading} tabindex="-1">{card?.title ?? 'Start with a card'}</h2></div>{#if selected && preview && before}<button class="quiet small" aria-pressed={compare} onclick={() => compare = !compare} disabled={busy}>{compare ? 'Show proposed card' : 'Compare cards'}</button>{/if}</div>
    {#if error}<div class="banner error" role="alert"><strong>{conflict ? 'Preview is stale' : 'Action needs attention'}</strong><p>{error}</p>{#if conflict}<button class="quiet small" onclick={showCurrent} disabled={busy}>Return to current card</button>{:else if project && error.includes('Project is busy')}<button class="quiet small" onclick={() => guard(async () => { await bridge.recover(); notice = 'Project lock is free. Preview your change again.'; })} disabled={busy}>Check interrupted save</button>{/if}</div>{/if}
    {#if notice}<p class="notice" role="status">{notice}</p>{/if}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (The fixed-size proof canvas needs focus and cross-engine keyboard scrolling.) -->
    <div class="canvas" role="region" aria-label="Card preview canvas" tabindex="0" onkeydown={scrollRegion}>
      {#if shown && card && template}<div class="proof-strip" class:comparing={compare}>
        {#if compare && before}<CardProof project={before} art={beforeArt} label="Before" detail={`Revision ${before.revision}`} />{/if}
        <CardProof project={shown} {art} label={selected ? 'Proposed' : 'Current'} detail={selected ? `Based on revision ${selected.expectedRevision}` : `${template.width} × ${template.height} logical px`} bind:bodyRef />
      </div>{:else}<div class="start-state"><div class="blank-card" aria-hidden="true"><span>◆</span><div></div><i></i><i></i><i></i></div><p class="eyebrow">Make room for the details</p><h2>A space for your next card.</h2><p>Open a local project to work on its rules, inspect the template and review each change before it becomes part of your card.</p><ol><li>Copy the neutral project fixture to a folder you own.</li><li>Enter that folder's path on the left.</li><li>Preview, check, then accept a change.</li></ol></div>{/if}
    </div>
    <section class="diagnostics" aria-labelledby="diagnostics-title">
      <div class="diagnostics-heading"><h2 id="diagnostics-title">Layout checks</h2><span class="validation" class:passing={report?.status === 'pass'} class:failing={report?.status === 'fail' || conflict} data-testid="validation-status" data-status={conflict ? 'stale' : report?.status ?? 'not-run'} aria-live="polite">{#if conflict}Validation stale{:else if report}Validation {report.status}{:else}Not checked yet{/if}</span></div>
      {#if busy}<p role="status">Preparing your change…</p>{:else if report}<div class="check-summary"><span>{report.lineCount} rendered lines</span><span>{report.finalLineWords} final-line words</span><span>Body + shared symbol</span></div>{#if report.diagnostics.length}<ul class="diagnostic-list">{#each report.diagnostics as diagnostic}<li><strong>{diagnostic.code}</strong><span class="region-label">{diagnostic.regionId}</span><span>{diagnostic.message}</span></li>{/each}</ul>{:else}<p class="hint">The proposed body and symbol meet this template's declared checks.</p>{/if}{:else}<p class="hint">{conflict ? 'A changed project or proposal needs a new measured preview.' : 'Preview a change to measure its actual text and shared symbol placement.'}</p>{/if}
      <p class="scope-note">Preview checks only. Title/footer and print output are not preflighted.</p>
    </section>
  </main>

  <aside id="inspector" class="inspector" aria-label="Card inspector">
    <div class="inspector-tabs" role="group" aria-label="Inspector view"><button aria-pressed={mode === 'edit'} onclick={() => mode = 'edit'}>Edit card</button><button aria-pressed={mode === 'review'} onclick={() => mode = 'review'}>Review proposal</button></div>
    {#if project && template && card}
      <div class="inspector-content">
        {#if mode === 'edit'}<section aria-labelledby="editor-title"><p class="eyebrow">Card content</p><h2 id="editor-title">Rules &amp; art</h2><label for="rules-text">Rules text</label><textarea id="rules-text" bind:value={draft} rows="8" spellcheck="false" disabled={busy} aria-describedby="rules-help"></textarea><p class="hint" id="rules-help">Your words stay intact. Nothing is rewritten to force a fit.</p><label for="art-variant">Art variant</label><select id="art-variant" bind:value={draftVariant} disabled={busy || !template.permittedOverrides.includes('variantId')}>{#each template.variants as variant}<option value={variant.id}>{variant.id}</option>{/each}</select><p class="hint">Named variants keep the shared symbol anchor.</p><button class="primary full" onclick={() => editorPreview()} disabled={busy}>Preview editor change</button></section>
        {:else}<section aria-labelledby="review-title"><p class="eyebrow">Explicit acceptance</p><h2 id="review-title" bind:this={reviewHeading} tabindex="-1">{selected?.kind === 'undo' ? 'Review undo' : 'Review change'}</h2>{#if selected}<p class="proposal-id" data-testid="review-proposal-id">{selected.id}</p><div class="review-meta"><span>Base revision {selected.expectedRevision}</span><span class="pending-tag">Pending acceptance</span></div>{#if before && preview}<ReviewDiff before={before.cards[0]} after={preview.cards[0]} />{/if}<button class="primary full accept" onclick={accept} disabled={!canAccept}>Accept preview</button><p class="hint">{conflict ? 'This preview is stale. Prepare a new change against the current project.' : report?.status === 'fail' ? 'Resolve the reported layout failures, then preview a new change.' : 'Acceptance saves exactly this measured proposal to the local project.'}</p><button class="quiet full" onclick={showCurrent} disabled={busy}>Return to current card</button>{:else}<div class="review-empty"><span aria-hidden="true">◇</span><h3>Every change gets a review.</h3><p>Select a pending proposal on the left, or preview a change from the editor.</p></div>{/if}</section>{/if}
        <details class="constraints" open><summary>Template constraints <span>Inherited</span></summary><dl><div><dt>Template</dt><dd>{template.id}</dd></div><div><dt>Preview size</dt><dd>{template.width} × {template.height} px</dd></div><div><dt>Body region</dt><dd>{template.body.width} × {template.body.height} px</dd></div><div><dt>Body position</dt><dd>{template.body.x}, {template.body.y} px</dd></div><div><dt>Typeface</dt><dd>Crimson Text</dd></div><div><dt>Font / minimum</dt><dd>{template.fontPx} / {template.minFontPx} px</dd></div><div><dt>Final line</dt><dd>{template.lastLineMinWords === null ? 'Rule disabled' : `At least ${template.lastLineMinWords} words`}</dd></div><div><dt>Shared symbol</dt><dd>{template.symbol.glyph} {template.symbol.id}</dd></div><div><dt>Symbol anchor</dt><dd>{template.symbol.x}, {template.symbol.y} px</dd></div></dl><p class="hint">Declared template rules, in logical preview pixels.</p></details>
        <section class="undo-section" aria-labelledby="undo-title"><h2 id="undo-title">Undo</h2><p class="hint">Restore the previous card through the same preview and acceptance checks.</p><button class="quiet full" onclick={() => editorPreview('undo')} disabled={busy || project.history.length === 0}>Preview undo</button></section>
      </div>
    {:else}<div class="inspector-empty"><p class="eyebrow">Card inspector</p><h2>Keep intent in view.</h2><p>Rules, inherited constraints and proposed changes will live here when you open a project.</p></div>{/if}
  </aside>
</div>

<style>
  .app-header { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 24px; border-bottom: 1px solid var(--line); background: var(--panel); }
  .brand, .header-state { display: flex; align-items: center; gap: 12px; } .brand h1 { margin: 0; font-size: 19px; font-weight: 650; letter-spacing: -.6px; }
  .brand-mark { display: grid; place-items: center; width: 28px; height: 34px; border: 1.5px solid var(--ink); border-radius: 4px; font-size: 13px; transform: rotate(-7deg); } .app-kind { font-size: 12px; color: var(--ink-secondary); padding-left: 14px; border-left: 1px solid var(--line); }
  .header-state { font-size: 12px; color: var(--ink-secondary); } .revision { color: var(--ink); border: 1px solid var(--line); padding: 5px 9px; border-radius: 5px; font-variant-numeric: tabular-nums; }
  .local-dot { width: 6px; height: 6px; border-radius: 50%; background: #466732; display: inline-block; flex-shrink: 0; }
  .workspace { display: grid; grid-template-columns: 200px minmax(0, 1fr) 308px; height: calc(100dvh - 64px); min-height: 640px; }
  .context { border-right: 1px solid var(--line); background: var(--panel); overflow-y: auto; display: flex; flex-direction: column; }
  .context-section { padding: 20px 16px; border-bottom: 1px solid var(--line); } .eyebrow { font-size: 10px; font-weight: 650; letter-spacing: 1.1px; text-transform: uppercase; color: var(--ink-secondary); margin: 0 0 8px; }
  .project-context h2 { font-size: 14px; font-weight: 600; line-height: 1.5; margin: 0 0 8px; overflow-wrap: anywhere; } .folder-name { font-size: 11px; color: var(--ink-secondary); margin: 0 0 12px; overflow-wrap: anywhere; }
  #project-form { margin-top: 16px; } #project-form input { min-width: 0; width: 100%; margin: 6px 0 10px; } #project-form button { width: 100%; }
  label { display: block; font-size: 12px; font-weight: 600; } .hint { color: var(--ink-secondary); font-size: 11px; line-height: 1.6; margin: 10px 0 0; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; } .section-heading h2 { font-size: 12px; font-weight: 600; margin: 0; } .count { font-size: 10px; min-width: 20px; text-align: center; padding: 2px 5px; border-radius: 4px; background: var(--surface); color: var(--ink-secondary); }
  .card-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 8px; border-color: transparent; background: var(--surface); } .card-item[aria-current] { border-color: #c3cdb6; background: var(--accent-soft); } .card-item strong { display: block; font-size: 12px; font-weight: 600; overflow-wrap: anywhere; } .card-item small { display: block; font-size: 10px; margin-top: 4px; color: var(--ink-secondary); }
  .mini-card { flex-shrink: 0; display: grid; place-items: center; width: 24px; height: 34px; border: 1px solid #8a927d; border-radius: 2px; background: var(--panel); font-size: 9px; }
  .proposal-context .hint { margin-bottom: 10px; } .empty-note { margin: 0; font-size: 11px; line-height: 1.6; color: var(--ink-secondary); }
  .proposal-item { width: 100%; display: flex; align-items: center; gap: 8px; margin-top: 5px; padding: 10px 8px; text-align: left; background: transparent; border-color: transparent; } .proposal-item.selected { border-color: #c3cdb6; background: var(--accent-soft); } .proposal-item > span:nth-child(2) { min-width: 0; flex: 1; } .proposal-item strong { display: block; font-size: 11px; font-weight: 600; overflow-wrap: anywhere; } .proposal-item small { display: block; font-size: 10px; margin-top: 4px; overflow-wrap: anywhere; color: var(--ink-secondary); } .proposal-dot { width: 5px; height: 5px; border-radius: 50%; background: #93642c; flex-shrink: 0; }
  .history-item { display: flex; align-items: start; gap: 8px; margin-top: 14px; font-size: 11px; } .history-item > span { color: #466732; } .history-item strong { font-size: 10px; font-weight: 500; overflow-wrap: anywhere; } .history-item small { display: block; color: var(--ink-secondary); font-size: 10px; margin-top: 4px; } .context-footer { margin-top: auto; padding: 22px 16px; display: flex; gap: 8px; align-items: baseline; } .context-footer p { font-size: 10px; color: var(--ink-secondary); line-height: 1.7; margin: 0; }
  .main-workspace { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--canvas); } .canvas-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 26px; flex-shrink: 0; } .canvas-toolbar .eyebrow { margin-bottom: 5px; } .canvas-toolbar h2 { font-size: 16px; margin: 0; font-weight: 550; overflow-wrap: anywhere; }
  .canvas { min-height: 0; flex: 1; overflow: auto; padding: 12px 32px 36px; background-image: radial-gradient(#afb4a844 .75px, transparent .75px); background-size: 16px 16px; } .proof-strip { display: flex; gap: 28px; min-width: min-content; width: fit-content; margin: 0 auto; } .proof-strip.comparing { margin: 0; }
  .start-state { max-width: 370px; text-align: center; margin: 28px auto; } .start-state h2 { margin: 10px 0 14px; font-family: 'Crimson Text', serif; font-size: 30px; font-weight: 400; letter-spacing: -.5px; } .start-state > p:not(.eyebrow) { color: var(--ink-secondary); font-size: 13px; line-height: 1.7; } .start-state ol { text-align: left; padding-left: 24px; color: var(--ink-secondary); font-size: 11px; line-height: 1.8; margin-top: 24px; }
  .blank-card { width: 92px; height: 128px; padding: 14px; margin: 0 auto 28px; border: 1px solid #b8bcae; border-radius: 5px; background: var(--panel); transform: rotate(-5deg); box-shadow: 0 8px 20px #30392b0d; } .blank-card span { display: block; font-size: 11px; text-align: right; } .blank-card div { height: 32px; margin: 12px 0; background: #e9ecdf; border-radius: 2px; } .blank-card i { display: block; width: 100%; height: 2px; background: #d8dccf; margin-top: 7px; } .blank-card i:last-child { width: 60%; }
  .diagnostics { flex-shrink: 0; padding: 16px 26px; border-top: 1px solid var(--line); background: var(--panel); max-height: 210px; overflow: auto; } .diagnostics-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; } .diagnostics h2 { margin: 0; font-size: 12px; font-weight: 600; } .validation { font-size: 10px; border: 1px solid var(--line); border-radius: 4px; padding: 4px 7px; color: var(--ink-secondary); } .validation.passing { color: #345227; background: var(--accent-soft); border-color: #c3cdb6; } .validation.failing { color: #882e24; background: #faeee9; border-color: #e5c6bc; } .check-summary { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; font-size: 11px; color: var(--ink-secondary); } .scope-note { color: var(--ink-secondary); font-size: 10px; margin: 12px 0 0; }
  .diagnostic-list { list-style: none; margin: 12px 0 0; padding: 0; } .diagnostic-list li { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; margin: 6px 0; font-size: 11px; line-height: 1.6; } .diagnostic-list strong { color: #882e24; font-weight: 600; } .region-label { font-size: 10px; padding: 0 4px; border: 1px solid var(--line); border-radius: 3px; color: var(--ink-secondary); }
  .banner { margin: 0 24px 12px; padding: 12px 14px; border: 1px solid #e5c6bc; border-radius: 6px; background: #faeee9; color: #882e24; } .banner strong { display: block; font-size: 12px; } .banner p { margin: 5px 0 0; font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; } .banner button { margin-top: 10px; } .notice { margin: 0 26px 10px; font-size: 11px; color: var(--ink-secondary); line-height: 1.5; }
  .inspector { border-left: 1px solid var(--line); background: var(--panel); min-width: 0; overflow: auto; } .inspector-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin: 16px; padding: 3px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); } .inspector-tabs button { border-color: transparent; background: transparent; font-size: 11px; padding: 8px; } .inspector-tabs button[aria-pressed=true] { background: var(--panel); border-color: var(--line); box-shadow: 0 1px 2px #00000007; } .inspector-content { padding: 8px 20px 24px; } .inspector-content h2 { font-size: 17px; font-weight: 550; margin: 0 0 20px; } .inspector-content label { margin-top: 20px; margin-bottom: 8px; } textarea { width: 100%; min-height: 176px; resize: vertical; line-height: 1.65; font-size: 13px; } select { width: 100%; font-size: 12px; } .full { width: 100%; } .inspector-content .primary { margin-top: 20px; } .proposal-id { font-size: 11px; color: var(--ink-secondary); overflow-wrap: anywhere; margin: -9px 0 14px; } .review-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px; color: var(--ink-secondary); } .pending-tag { color: #77501f; } .accept + .hint { margin-bottom: 12px; }
  .review-empty { margin: 28px 0; color: var(--ink-secondary); } .review-empty > span { font-size: 28px; color: #7b826b; } .review-empty h3 { font-size: 13px; color: var(--ink); font-weight: 550; margin: 14px 0 8px; } .review-empty p { font-size: 12px; line-height: 1.7; margin: 0; }
  .constraints { border-top: 1px solid var(--line); padding-top: 20px; margin-top: 26px; } summary { font-size: 12px; font-weight: 600; cursor: pointer; } summary span { font-size: 10px; font-weight: 400; color: var(--ink-secondary); margin-left: 6px; } dl { margin: 16px 0 0; } dl > div { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 11px; font-size: 11px; line-height: 1.45; } dt { color: var(--ink-secondary); } dd { margin: 0; text-align: right; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
  .undo-section { border-top: 1px solid var(--line); padding-top: 20px; margin-top: 24px; } .undo-section h2 { font-size: 12px; margin-bottom: 8px; } .undo-section button { margin-top: 12px; } .inspector-empty { padding: 12px 24px; } .inspector-empty h2 { font-size: 17px; font-weight: 550; } .inspector-empty > p:last-child { color: var(--ink-secondary); font-size: 12px; line-height: 1.7; }
  @media (min-width: 1450px) { .workspace { grid-template-columns: 220px minmax(0, 1fr) 340px; } .inspector-content { padding: 8px 24px 24px; } }
  @media (max-width: 980px) { .workspace { grid-template-columns: 170px minmax(0, 1fr) 280px; } .canvas { padding: 12px 20px 28px; } .canvas-toolbar { padding: 18px 20px; } .diagnostics { padding: 16px 20px; } .context-section { padding: 18px 12px; } .inspector-content { padding: 8px 16px 20px; } }
  @media (max-width: 860px) { .workspace { height: auto; min-height: 0; grid-template-columns: 170px minmax(0, 1fr); align-items: stretch; } .inspector { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--line); } .main-workspace { min-height: 750px; } .inspector-content { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; padding: 8px 24px 24px; } .constraints { margin-top: 0; padding-top: 0; border-top: 0; } .undo-section { grid-column: 1 / -1; margin-top: 0; } }
  @media (max-width: 560px) { .app-header { padding: 0 16px; } .app-kind, .header-state > .local-dot, .header-state > span:nth-child(2) { display: none; } .workspace { grid-template-columns: minmax(0, 1fr); } .context { border-right: 0; border-bottom: 1px solid var(--line); } .context-section { padding: 16px; } .history, .context-footer { display: none; } .inspector-content { display: block; padding: 8px 20px 24px; } .constraints { margin-top: 24px; border-top: 1px solid var(--line); padding-top: 20px; } .undo-section { margin-top: 24px; } .main-workspace { min-height: 760px; } .canvas-toolbar { flex-wrap: wrap; } }
</style>
