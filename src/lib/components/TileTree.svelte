<script lang="ts">
  import type { TreeNode } from "../tiling/types";
  import { tileRegistry, fallbackTileType } from "../tiles/registry";
  import { tileCatalog } from "../tiles/catalog";
  import TileTree from "./TileTree.svelte";

  let { node, focused, gaps }: { node: TreeNode; focused: number; gaps: number } = $props();

  // Below this, a tile's own layout (toolbars, tables, canvases) starts
  // breaking down rather than just looking cramped - showing a clear
  // message beats letting every tile reimplement its own tiny-size
  // handling, and the component stays mounted underneath so resizing back
  // up never loses state (an open file, scroll position, form input, etc.)
  const MIN_WIDTH = 160;
  const MIN_HEIGHT = 120;

  let leafEl: HTMLDivElement | undefined = $state();
  let tooSmall = $state(false);
  const labelByType = new Map(tileCatalog.map((t) => [t.type, t.label]));

  $effect(() => {
    if (!leafEl) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      tooSmall = width < MIN_WIDTH || height < MIN_HEIGHT;
    });
    ro.observe(leafEl);
    return () => ro.disconnect();
  });
</script>

{#if node.kind === "Leaf"}
  {@const Comp = tileRegistry[node.tile_type] ?? tileRegistry[fallbackTileType]}
  <div class="leaf" class:focused={node.id === focused} style="margin: {gaps / 2}px;" bind:this={leafEl}>
    <Comp id={node.id} tileType={node.tile_type} focused={node.id === focused} />
    {#if tooSmall}
      <div class="too-small-overlay">
        <span class="label">{labelByType.get(node.tile_type) ?? node.tile_type}</span>
        <span class="hint">Tile too small to render - resize with <code>Ctrl+h/j/k/l</code> or <code>+</code>/<code>-</code></span>
      </div>
    {/if}
  </div>
{:else}
  <div class="split" style="flex-direction: {node.axis === 'Row' ? 'row' : 'column'};">
    {#each node.children as child, i (i)}
      <div class="child-wrapper" style="flex: {node.ratios[i]} 0 0;">
        <TileTree node={child} {focused} {gaps} />
      </div>
    {/each}
  </div>
{/if}

<style>
  .split {
    display: flex;
    flex: 1;
    min-width: 0;
    min-height: 0;
    height: 100%;
    width: 100%;
  }
  .child-wrapper {
    display: flex;
    min-width: 0;
    min-height: 0;
  }
  .leaf {
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    border: 2px solid transparent;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--tile-bg);
  }
  .leaf.focused {
    border-color: var(--accent);
  }
  .too-small-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.5rem;
    text-align: center;
    background: var(--tile-bg);
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
  }
  .too-small-overlay .label {
    font-size: 0.78rem;
    font-weight: 600;
    opacity: 0.85;
  }
  .too-small-overlay .hint {
    font-size: 0.68rem;
    opacity: 0.55;
    line-height: 1.4;
  }
  .too-small-overlay code {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.08);
    padding: 0.02rem 0.3rem;
    border-radius: 3px;
  }
</style>
