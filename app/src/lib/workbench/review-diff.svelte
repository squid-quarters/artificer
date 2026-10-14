<script lang="ts">
  import type { Card } from '#lib/model.ts';
  import { scrollRegion } from '#lib/workbench/scroll-region.ts';
  let { before, after }: { before: Card; after: Card } = $props();
</script>
<section aria-label="Proposal comparison" data-testid="change-diff" class="diff">
  <div class="diff-heading"><h3>Title</h3><span>{before.title === after.title ? 'Unchanged' : 'Changed'}</span></div>
  <div class="version before"><h4>Before title</h4><!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Long titles need the same named keyboard scrolling as rules text.) --><p role="region" aria-label="Before title" tabindex="0" onkeydown={scrollRegion} data-testid="before-title">{before.title || 'Empty title'}</p></div>
  <div class="version after"><h4>After title</h4><!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Long titles need the same named keyboard scrolling as rules text.) --><p role="region" aria-label="After title" tabindex="0" onkeydown={scrollRegion} data-testid="after-title">{after.title || 'Empty title'}</p></div>
  <div class="diff-heading"><h3>Rules text</h3><span>{before.body === after.body ? 'Unchanged' : 'Changed'}</span></div>
  <div class="version before"><h4>Before</h4><!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Long rules text must be scrollable from the keyboard.) -->
    <p role="region" aria-label="Before rules text" tabindex="0" onkeydown={scrollRegion} data-testid="before-rules">{before.body || 'Empty rules text'}</p></div>
  <div class="version after"><h4>After</h4><!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Long rules text must be scrollable from the keyboard.) -->
    <p role="region" aria-label="After rules text" tabindex="0" onkeydown={scrollRegion} data-testid="after-rules">{after.body || 'Empty rules text'}</p></div>
  <div class="variant-change"><h3>Art variant</h3><p><span>{before.variantId}</span><span aria-label="changes to"> → </span><strong>{after.variantId}</strong></p></div>
  <p class="inheritance">Template and shared symbol anchors are inherited.</p>
</section>
<style>
  .diff { margin-top: 20px; }
  h3, h4, p { margin: 0; }
  .diff-heading { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  h3 { font-size: 12px; font-weight: 600; } .diff-heading span { font-size: 11px; color: var(--ink-secondary); }
  .version { border: 1px solid var(--line); border-radius: 6px; margin-top: 8px; padding: 12px; }
  h4 { color: var(--ink-secondary); font-size: 11px; margin-bottom: 8px; }
  .version p { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.6; max-height: 170px; overflow: auto; }
  .after + .diff-heading { margin-top: 16px; }
  .after { background: var(--accent-soft); border-color: #ccd6bc; }
  .variant-change { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 16px; }
  .variant-change p { display: inline-flex; flex-wrap: wrap; gap: 4px; font-size: 12px; overflow-wrap: anywhere; }
  .inheritance { color: var(--ink-secondary); font-size: 11px; line-height: 1.5; margin-top: 12px; }
</style>
