<script lang="ts">
  import type { Card, Template } from '#lib/model.ts';
  let { card, template, art = '', bodyRef = $bindable<HTMLElement | undefined>() }: { card: Card; template: Template; art?: string; bodyRef?: HTMLElement } = $props();
</script>
<article aria-label={card.title} style:width={`${template.width}px`} style:height={`${template.height}px`}>
  <h2>{card.title}</h2>
  <span class="symbol" data-testid="shared-symbol" style:left={`${template.symbol.x}px`} style:top={`${template.symbol.y}px`} aria-label={`Symbol ${template.symbol.id}`}>{template.symbol.glyph}</span>
  {#if art}<img src={art} alt="Original neutral fixture art" />{/if}
  <div bind:this={bodyRef} class="body" data-testid="card-body" style:left={`${template.body.x}px`} style:top={`${template.body.y}px`} style:width={`${template.body.width}px`} style:height={`${template.body.height}px`} style:font-size={`${template.fontPx}px`}>{card.body}</div>
  <footer>Neutral fixture · {card.variantId}</footer>
</article>
<style>
  article { position: relative; border: 2px solid #34444b; background: #fbfaf6; color: #17292c; box-sizing: border-box; font-family: 'Crimson Text', serif; }
  h2 { margin: 22px; font-size: 25px; padding-right: 45px; }
  .symbol { position: absolute; font-size: 24px; }
  img { position: absolute; left: 24px; top: 76px; width: calc(100% - 48px); height: 86px; object-fit: cover; }
  .body { position: absolute; line-height: 1.35; white-space: pre-wrap; overflow: hidden; overflow-wrap: break-word; }
  footer { position: absolute; bottom: 20px; left: 24px; font-size: 13px; }
</style>
