<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let sizesText = $state("4, 8, 8, 3");
  let useBias = $state(true);
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  const sizes = $derived.by(() => {
    return sizesText
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  });

  const MAX_SHOWN = 10;
  const layout = $derived.by(() => {
    const n = sizes.length;
    const width = 320;
    const height = 220;
    const layers = sizes.map((size, li) => {
      const shown = Math.min(size, MAX_SHOWN);
      const x = n > 1 ? 30 + (li / (n - 1)) * (width - 60) : width / 2;
      const neurons = Array.from({ length: shown }, (_, ni) => ({
        x,
        y: 20 + ((ni + 1) / (shown + 1)) * (height - 40),
      }));
      return { size, shown, truncated: size > MAX_SHOWN, neurons };
    });
    return { layers, width, height };
  });

  const layerParams = $derived.by(() => {
    const out: { from: number; to: number; params: number }[] = [];
    for (let i = 0; i < sizes.length - 1; i++) {
      const params = sizes[i] * sizes[i + 1] + (useBias ? sizes[i + 1] : 0);
      out.push({ from: sizes[i], to: sizes[i + 1], params });
    }
    return out;
  });
  const totalParams = $derived(layerParams.reduce((s, l) => s + l.params, 0));

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="nn-tile">
  <div class="toolbar">
    <label>
      Layer sizes (comma-separated, input→output)
      <input bind:this={inputEl} bind:value={sizesText} onkeydown={onKeydown} spellcheck="false" />
    </label>
    <label class="checkbox"><input type="checkbox" bind:checked={useBias} /> include bias</label>
  </div>

  <svg viewBox="0 0 {layout.width} {layout.height}" class="diagram">
    {#each layout.layers.slice(0, -1) as layer, li (li)}
      {#each layer.neurons as from, fi (fi)}
        {#each layout.layers[li + 1].neurons as to, ti (ti)}
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(255,255,255,0.08)" />
        {/each}
      {/each}
    {/each}
    {#each layout.layers as layer, li (li)}
      {#each layer.neurons as nrn, ni (ni)}
        <circle cx={nrn.x} cy={nrn.y} r="7" />
      {/each}
      {#if layer.truncated}
        <text x={layer.neurons[0]?.x ?? 0} y={layout.height - 4} text-anchor="middle" class="more">+{layer.size - layer.shown} more</text>
      {/if}
      <text x={layer.neurons[0]?.x ?? 0} y="12" text-anchor="middle" class="size-label">{layer.size}</text>
    {/each}
  </svg>

  <div class="params">
    {#each layerParams as l, i (i)}
      <div class="param-row"><span class="mono">{l.from} → {l.to}</span><span class="dim">{l.params.toLocaleString()} params</span></div>
    {/each}
    <div class="param-row total"><span>Total</span><span class="mono">{totalParams.toLocaleString()}</span></div>
  </div>
</div>

<style>
  .nn-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.7rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: flex-end;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.75rem;
    opacity: 0.85;
  }
  label.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
  }
  input:not([type="checkbox"]) {
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.82rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
    min-width: 14rem;
  }
  .diagram {
    flex: 1;
    width: 100%;
  }
  circle {
    fill: var(--accent);
    opacity: 0.85;
  }
  text {
    fill: var(--fg);
    font-size: 10px;
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
  }
  text.more {
    opacity: 0.5;
    font-size: 9px;
  }
  text.size-label {
    opacity: 0.6;
  }
  .params {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.4rem 0.6rem;
  }
  .param-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
  }
  .param-row.total {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin-top: 0.2rem;
    padding-top: 0.2rem;
    font-weight: 600;
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .dim {
    opacity: 0.6;
  }
</style>
