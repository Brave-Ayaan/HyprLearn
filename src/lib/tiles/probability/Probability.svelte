<script lang="ts">
  import { onDestroy } from "svelte";
  import { vimState } from "../../vim/stateMachine.svelte";
  import { theoreticalDistribution, rollOnce } from "./engine";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let numDice = $state(2);
  let sides = $state(6);
  let rollsPerTick = $state(50);
  let running = $state(false);

  let counts: number[] = $state([]);
  let totalRolls = $state(0);
  let rafId: number | null = null;

  const minSum = $derived(numDice);
  const maxSum = $derived(numDice * sides);
  const theoretical = $derived(theoreticalDistribution(numDice, sides));

  function resetCounts() {
    counts = new Array(maxSum - minSum + 1).fill(0);
    totalRolls = 0;
  }

  $effect(() => {
    void [numDice, sides];
    resetCounts();
  });

  function rollBatch(n: number) {
    for (let i = 0; i < n; i++) {
      const sum = rollOnce(numDice, sides);
      counts[sum - minSum]++;
    }
    totalRolls += n;
  }

  function tick() {
    if (running) rollBatch(rollsPerTick);
    rafId = requestAnimationFrame(tick);
  }

  $effect(() => {
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  });

  onDestroy(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
  });

  const maxBarValue = $derived.by(() => {
    const empMax = Math.max(...counts.map((c) => (totalRolls ? c / totalRolls : 0)), 0.001);
    const theoMax = Math.max(...theoretical, 0.001);
    return Math.max(empMax, theoMax);
  });

  let inputEl: HTMLInputElement | undefined = $state();
  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="prob-tile">
  <div class="toolbar">
    <label>dice <input bind:this={inputEl} type="number" min="1" max="10" bind:value={numDice} onkeydown={onKeydown} /></label>
    <label>sides <input type="number" min="2" max="100" bind:value={sides} onkeydown={onKeydown} /></label>
    <label>rolls/tick <input type="number" min="1" max="2000" bind:value={rollsPerTick} onkeydown={onKeydown} /></label>
    <button type="button" onclick={() => (running = !running)}>{running ? "Pause" : "Roll"}</button>
    <button type="button" onclick={() => rollBatch(1)}>Roll once</button>
    <button type="button" onclick={resetCounts}>Reset</button>
    <span class="stat">{totalRolls.toLocaleString()} rolls</span>
  </div>

  <div class="chart">
    {#each counts as c, i (i)}
      {@const sum = minSum + i}
      {@const empirical = totalRolls ? c / totalRolls : 0}
      {@const theo = theoretical[i] ?? 0}
      <div class="bar-col">
        <div class="bars">
          <div class="bar theo" style="height: {(theo / maxBarValue) * 100}%" title="theoretical {(theo * 100).toFixed(2)}%"></div>
          <div class="bar emp" style="height: {(empirical / maxBarValue) * 100}%" title="observed {(empirical * 100).toFixed(2)}%"></div>
        </div>
        <span class="label">{sum}</span>
      </div>
    {/each}
  </div>

  <div class="legend">
    <span><span class="swatch theo"></span> theoretical</span>
    <span><span class="swatch emp"></span> observed</span>
    <span class="note">{numDice}d{sides}: sums range {minSum}-{maxSum}</span>
  </div>
</div>

<style>
  .prob-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.78rem;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    opacity: 0.8;
  }
  input {
    width: 3.2rem;
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.15rem 0.3rem;
  }
  button {
    font: inherit;
    padding: 0.25rem 0.6rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .stat {
    margin-left: auto;
    opacity: 0.55;
  }
  .chart {
    flex: 1;
    display: flex;
    align-items: stretch;
    gap: 2px;
    overflow-x: auto;
    padding-top: 0.5rem;
  }
  .bar-col {
    flex: 1;
    min-width: 1.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }
  .bars {
    flex: 1;
    width: 100%;
    display: flex;
    gap: 1px;
    align-items: flex-end;
  }
  .bar {
    flex: 1;
    border-radius: 2px 2px 0 0;
    transition: height 0.05s linear;
  }
  .bar.theo {
    background: rgba(255, 255, 255, 0.25);
  }
  .bar.emp {
    background: var(--accent);
  }
  .label {
    font-size: 0.65rem;
    opacity: 0.6;
    margin-top: 0.2rem;
  }
  .legend {
    display: flex;
    gap: 1rem;
    font-size: 0.7rem;
    opacity: 0.7;
    align-items: center;
  }
  .swatch {
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 2px;
    margin-right: 0.3rem;
  }
  .swatch.theo {
    background: rgba(255, 255, 255, 0.25);
  }
  .swatch.emp {
    background: var(--accent);
  }
  .note {
    margin-left: auto;
    opacity: 0.5;
  }
</style>
