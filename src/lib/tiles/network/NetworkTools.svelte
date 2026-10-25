<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import ReferenceBrowser from "../../components/ReferenceBrowser.svelte";
  import { ports } from "./ports";
  import { subnetInfo } from "./subnet";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let cidrInput = $state("192.168.1.10/24");
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  const result = $derived.by(() => {
    const [ip, prefixStr] = cidrInput.split("/");
    try {
      return { info: subnetInfo(ip, Number(prefixStr)), error: null };
    } catch (err) {
      return { info: null, error: err instanceof Error ? err.message : "Invalid input" };
    }
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="net-tile">
  <section class="subnet">
    <h3>IPv4 Subnet Calculator</h3>
    <input
      bind:this={inputEl}
      bind:value={cidrInput}
      onkeydown={onKeydown}
      placeholder="e.g. 192.168.1.10/24"
      spellcheck="false"
      class="cidr-input"
    />
    {#if result.error}
      <div class="error">{result.error}</div>
    {:else if result.info}
      <div class="grid">
        <div><span class="label">Network</span><span class="mono">{result.info.network}</span></div>
        <div><span class="label">Broadcast</span><span class="mono">{result.info.broadcast}</span></div>
        <div><span class="label">Netmask</span><span class="mono">{result.info.mask}</span></div>
        <div><span class="label">Wildcard</span><span class="mono">{result.info.wildcard}</span></div>
        <div><span class="label">Usable range</span><span class="mono">{result.info.firstUsable} – {result.info.lastUsable}</span></div>
        <div><span class="label">Usable hosts</span><span class="mono">{result.info.usableHosts.toLocaleString()}</span></div>
      </div>
    {/if}
  </section>

  <section class="ports">
    <ReferenceBrowser entries={ports} focused={focused} emptyHint="No matching ports" />
  </section>
</div>

<style>
  .net-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
  }
  .subnet {
    flex-shrink: 0;
    padding: 0.7rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.85rem;
    opacity: 0.85;
  }
  .cidr-input {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.35rem 0.55rem;
    outline: none;
    margin-bottom: 0.5rem;
  }
  .cidr-input:focus {
    border-color: var(--accent);
  }
  .error {
    color: var(--error);
    font-size: 0.78rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.3rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem 0.6rem;
  }
  .label {
    display: block;
    opacity: 0.55;
    font-size: 0.7rem;
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .ports {
    flex: 1;
    min-height: 0;
  }
</style>
