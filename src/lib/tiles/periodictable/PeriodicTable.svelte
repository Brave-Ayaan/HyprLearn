<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { elements, categoryColor, categoryLabel, type ElementData } from "./data";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let selected: ElementData | null = $state(elements.find((e) => e.symbol === "H") ?? null);
  let query = $state("");
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  function cssRow(period: number): number {
    return period <= 7 ? period : period + 1;
  }

  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      elements.filter((e) => e.name.toLowerCase().includes(q) || e.symbol.toLowerCase() === q || String(e.number) === q).map((e) => e.number),
    );
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="pt-tile">
  <div class="grid-panel">
    <input
      bind:this={inputEl}
      bind:value={query}
      onkeydown={onKeydown}
      placeholder="Search by name, symbol, or number..."
      spellcheck="false"
      class="search"
    />
    <div class="grid">
      {#each elements as el (el.number)}
        <button
          type="button"
          class="cell"
          class:dim={matches && !matches.has(el.number)}
          class:selected={selected?.number === el.number}
          style="grid-column: {el.group}; grid-row: {cssRow(el.period)}; --cat-color: {categoryColor[el.category]};"
          onclick={() => (selected = el)}
        >
          <span class="num">{el.number}</span>
          <span class="sym">{el.symbol}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="detail-panel">
    {#if selected}
      <div class="symbol-big" style="color: {categoryColor[selected.category]};">{selected.symbol}</div>
      <h2>{selected.name}</h2>
      <table>
        <tbody>
          <tr><td class="k">Atomic number</td><td>{selected.number}</td></tr>
          <tr><td class="k">Atomic mass</td><td>{selected.mass}</td></tr>
          <tr><td class="k">Category</td><td>{categoryLabel[selected.category]}</td></tr>
          <tr><td class="k">Group</td><td>{selected.group}</td></tr>
          <tr><td class="k">Period</td><td>{selected.period <= 7 ? selected.period : selected.category === "lanthanide" ? 6 : 7}</td></tr>
        </tbody>
      </table>
    {:else}
      <p class="hint">Click an element.</p>
    {/if}

    <div class="legend">
      {#each Object.entries(categoryLabel) as [cat, label] (cat)}
        <div class="legend-row">
          <span class="swatch" style="background: {categoryColor[cat as keyof typeof categoryColor]};"></span>
          <span>{label}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .pt-tile {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.78rem;
  }
  .grid-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    overflow: auto;
  }
  .search {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(18, minmax(2.1rem, 1fr));
    grid-auto-rows: 2.4rem;
    gap: 2px;
    min-width: 42rem;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: 0.15rem 0.3rem;
    border: 1px solid var(--cat-color);
    background: color-mix(in srgb, var(--cat-color) 18%, transparent);
    color: var(--fg);
    border-radius: 3px;
    cursor: pointer;
    font: inherit;
    text-align: left;
    overflow: hidden;
  }
  .cell:hover {
    background: color-mix(in srgb, var(--cat-color) 35%, transparent);
  }
  .cell.selected {
    outline: 2px solid var(--fg);
    background: color-mix(in srgb, var(--cat-color) 55%, transparent);
  }
  .cell.dim {
    opacity: 0.2;
  }
  .num {
    font-size: 0.55rem;
    opacity: 0.7;
  }
  .sym {
    font-size: 0.85rem;
    font-weight: 700;
  }
  .detail-panel {
    width: 14rem;
    flex-shrink: 0;
    border-left: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    padding: 0.75rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .symbol-big {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
  }
  h2 {
    margin: 0;
    font-size: 1rem;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  td {
    padding: 0.2rem 0;
    font-size: 0.78rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  td.k {
    opacity: 0.55;
    width: 6rem;
  }
  .hint {
    opacity: 0.5;
  }
  .legend {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.68rem;
  }
  .legend-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    opacity: 0.8;
  }
  .swatch {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 2px;
    flex-shrink: 0;
  }
</style>
