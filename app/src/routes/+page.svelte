<script lang="ts">
  import { onMount, tick } from 'svelte';
  import DenseCard from '#lib/dense-card.svelte';
  import { bridge } from '#lib/bridge.ts';
  import { candidate, type Project, type Proposal, type Validation } from '#lib/model.ts';
  import { measure } from '#lib/measure.ts';
  let path = $state(''); let project = $state<Project>(); let preview = $state<Project>();
  let proposals = $state<Proposal[]>([]); let selected = $state<Proposal>();
  let report = $state<Validation>(); let error = $state(''); let busy = $state(false);
  let bodyRef = $state<HTMLElement>(); let art = $state(''); let draft = $state('');
  const shown = $derived(preview ?? project);
  const card = $derived(shown?.cards[0]);
  const template = $derived(shown?.templates.find(t => t.id === card?.templateId));
  async function guard(action: () => Promise<void>) { busy = true; error = ''; try { await action(); } catch (e) { error = String(e); } finally { busy = false; } }
  async function loadArt() {
    if (!card || !template) return;
    const id = template.variants.find(v => v.id === card.variantId)?.artAssetId;
    art = id ? await bridge.asset(id) : '';
  }
  async function open() { await guard(async () => { project = undefined; preview = undefined; selected = undefined; report = undefined; proposals = []; art = ''; project = await bridge.open(path); draft = project.cards[0].body; await loadArt(); proposals = await bridge.proposals(); }); }
  async function inspect(proposal: Proposal) { await guard(async () => {
    project = await bridge.project(); selected = proposal; report = undefined; preview = candidate(project, proposal);
    await loadArt(); await tick();
    if (!bodyRef || !template) throw new Error('Renderer not ready');
    const measured = await measure(bodyRef, template); await bridge.validate(proposal.id, project.revision, proposal, measured); report = measured;
  }); }
  async function accept() { await guard(async () => {
    if (!selected || !project || !report || report.status !== 'pass') throw new Error('A passing rendered preview is required');
    project = await bridge.accept(selected.id, project.revision); preview = undefined; selected = undefined; report = undefined;
    draft = project.cards[0].body; await loadArt(); proposals = await bridge.proposals();
  }); }
  async function editorPreview(kind: 'edit' | 'undo' = 'edit') {
    if (!project) return;
    let proposal: Proposal | undefined;
    await guard(async () => { proposal = await bridge.propose(project!.revision, project!.cards[0].id, kind === 'edit' ? draft : null, null, kind); });
    if (proposal) await inspect(proposal);
  }
  onMount(() => {
    const poll = setInterval(async () => { if (!project || busy) return; try { proposals = await bridge.proposals(); } catch (e) { error = String(e); } }, 750);
    return () => clearInterval(poll);
  });
</script>
<svelte:head><title>Artificer · dense-card slice</title></svelte:head>
<main>
  <header><h1>Artificer</h1><p>Dense-card authoring · explicit changes, measured preview</p></header>
  <section class="open"><label>Project folder <input aria-label="Project folder" bind:value={path} placeholder="Choose an existing project folder" /></label><button onclick={open} disabled={busy}>Open project</button></section>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if project && card && template}
    <p data-testid="revision">Revision {project.revision}</p>
    {#if error.includes('Project is busy')}<button onclick={() => guard(async () => { await bridge.recover(); })} disabled={busy}>Check interrupted save</button>{/if}
    <p class="note">Preview dimensions are logical pixels. Print profile is unset. The fixture widow rule is explicit; no product-wide threshold or automatic rewrite is applied.</p>
    <div class="workbench">
      <DenseCard {card} {template} {art} bind:bodyRef />
      <section class="inspector">
        <h2>Editor</h2><label>Rules text <textarea aria-label="Rules text" bind:value={draft} rows="8"></textarea></label>
        <div class="actions"><button onclick={() => editorPreview()} disabled={busy}>Preview editor change</button><button onclick={() => editorPreview('undo')} disabled={busy || project.history.length === 0}>Preview undo</button></div>
        <h2>Pending proposals</h2>
        {#each proposals.filter(p => p.status === 'pending') as proposal}<button class="proposal" onclick={() => inspect(proposal)} disabled={busy}>Preview {proposal.id}</button>{/each}
        {#if selected}<h3>Change {selected.id}</h3><pre data-testid="change-diff">{selected.kind === 'undo' ? 'Restore previous card content' : `${project.cards[0].body}\n→\n${preview?.cards[0].body}`}</pre>{/if}
        {#if report}<p data-testid="validation-status">Validation {report.status}</p>{#each report.diagnostics as diagnostic}<p role="status">{diagnostic.code}: {diagnostic.message}</p>{/each}<p>{report.lineCount} lines · {report.finalLineWords} final-line words</p>{/if}
        <button onclick={accept} disabled={busy || !selected || report?.status !== 'pass'}>Accept preview</button>
        <p class="note">Agent changes stay pending until accepted here. Stale previews cannot overwrite a newer revision.</p>
      </section>
    </div>
  {:else}<p>Open a portable project in the desktop app. Start with the original neutral fixture.</p>{/if}
</main>
<style>
  main { max-width: 1120px; margin: auto; padding: 28px; } h1 { font-size: 32px; margin: 0; }
  header { margin-bottom: 24px; } .open, .actions { display: flex; gap: 12px; align-items: end; }
  label { display: flex; flex-direction: column; gap: 7px; } .open input { min-width: 360px; }
  .workbench { display: grid; grid-template-columns: 360px 1fr; gap: 32px; align-items: start; }
  .inspector { background: #fff; padding: 24px; border: 1px solid #c4cfcb; } .inspector h2 { font-size: 18px; }
  textarea { width: 100%; box-sizing: border-box; resize: vertical; } .actions { margin-top: 12px; }
  .proposal { display: block; margin: 8px 0; } pre { white-space: pre-wrap; font-size: 12px; max-height: 160px; overflow: auto; }
  .note { color: #526865; font-size: 13px; max-width: 760px; } [role='alert'] { color: #8f2525; }
  @media(max-width: 800px) { .workbench { grid-template-columns: 1fr; } .open { flex-wrap: wrap; } .open input { min-width: 250px; } }
</style>
