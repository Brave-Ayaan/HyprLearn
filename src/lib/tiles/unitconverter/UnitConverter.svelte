<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { categories, convertTemperature, temperatureUnits } from "./data";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let categoryName = $state("Length");
  let value = $state(1);
  let fromUnit = $state("m");
  let hostEl: HTMLDivElement | undefined = $state();

  const isTemperature = $derived(categoryName === "Temperature");
  const category = $derived(categories.find((c) => c.name === categoryName));

  $effect(() => {
    // Reset the "from" unit when switching category so it's always valid.
    if (isTemperature) {
      fromUnit = "C";
    } else if (category && !category.units.some((u) => u.id === fromUnit)) {
      fromUnit = category.units[0].id;
    }
  });

  $effect(() => {
    if (focused) queueMicrotask(() => hostEl?.querySelector("input")?.focus());
  });

  function fmt(n: number): string {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(4);
    return parseFloat(n.toPrecision(8)).toString();
  }

  const conversions = $derived.by(() => {
    if (isTemperature) {
      return temperatureUnits.map((u) => ({ id: u.id, name: u.name, value: convertTemperature(value, fromUnit, u.id) }));
    }
    if (!category) return [];
    const fromDef = category.units.find((u) => u.id === fromUnit);
    if (!fromDef) return [];
    const base = value * fromDef.toBase;
    return category.units.map((u) => ({ id: u.id, name: u.name, value: base / u.toBase }));
  });
</script>

<div class="unit-tile" bind:this={hostEl}>
  <div class="toolbar">
    <select bind:value={categoryName} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()}>
      {#each categories as c (c.name)}<option value={c.name}>{c.name}</option>{/each}
      <option value="Temperature">Temperature</option>
    </select>

    <input
      type="number"
      bind:value
      onfocus={() => vimState.enterInsert()}
      onblur={() => vimState.enterNormal()}
    />

    <select bind:value={fromUnit} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()}>
      {#if isTemperature}
        {#each temperatureUnits as u (u.id)}<option value={u.id}>{u.name}</option>{/each}
      {:else if category}
        {#each category.units as u (u.id)}<option value={u.id}>{u.name} ({u.id})</option>{/each}
      {/if}
    </select>
  </div>

  <ul class="conversions">
    {#each conversions as c (c.id)}
      <li class:self={c.id === fromUnit}>
        <span class="name">{c.name}</span>
        <span class="value">{fmt(c.value)}</span>
        <span class="unit-id">{c.id}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .unit-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.7rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.85rem;
  }
  .toolbar {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  select,
  input {
    font: inherit;
    font-size: 0.85rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
  }
  input {
    width: 7rem;
  }
  select:focus,
  input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .conversions {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .conversions li {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.3rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .conversions li.self {
    background: rgba(255, 255, 255, 0.07);
    outline: 1px solid var(--accent);
  }
  .name {
    flex: 1;
    opacity: 0.7;
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
  }
  .value {
    font-weight: 600;
  }
  .unit-id {
    opacity: 0.5;
    width: 3rem;
  }
</style>
