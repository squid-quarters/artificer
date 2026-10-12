<script lang="ts">
  import DenseCard from '#lib/dense-card.svelte';
  import type { Project } from '#lib/model.ts';
  let { project, art, label, detail, bodyRef = $bindable<HTMLElement | undefined>() }: {
    project: Project; art: string; label: string; detail: string; bodyRef?: HTMLElement;
  } = $props();
  const card = $derived(project.cards[0]);
  const template = $derived(project.templates.find(t => t.id === card.templateId));
</script>
<section class="proof" aria-label={`${label} card`} data-testid={label === 'Before' ? 'current-proof' : 'active-proof'}>
  <div class="proof-label"><strong>{label}</strong><span>{detail}</span></div>
  {#if template}<div class="paper"><DenseCard {card} {template} {art} bind:bodyRef /></div>{/if}
</section>
<style>
  .proof { flex: 0 0 auto; width: max-content; }
  .proof-label { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 14px; color: var(--ink-secondary); font-size: 12px; }
  .proof-label strong { color: var(--ink); font-weight: 600; }
  .paper { box-shadow: 0 2px 3px #27282012, 0 12px 30px #27282016; }
</style>
