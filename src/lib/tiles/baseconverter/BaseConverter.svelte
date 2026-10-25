<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { formatInBase, isValidDigit, maskToWidth, parseInBase, toSigned, type Base, type BitWidth } from "../../util/bitwise";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let base: Base = $state(10);
  let bitWidth: BitWidth = $state(32);
  let text = $state("255");
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    if (e.key.length === 1 && e.key !== "-" && !isValidDigit(e.key, base)) e.preventDefault();
    e.stopPropagation();
  }

  const value = $derived.by((): bigint | null => {
    try {
      return parseInBase(text, base);
    } catch {
      return null;
    }
  });
  const binView = $derived(value !== null ? formatInBase(value, 2, bitWidth) : "—");
  const octView = $derived(value !== null ? formatInBase(value, 8, bitWidth) : "—");
  const decView = $derived(value !== null ? maskToWidth(value, bitWidth).toString() : "—");
  const hexView = $derived(value !== null ? formatInBase(value, 16, bitWidth).toUpperCase() : "—");
  const signedView = $derived(value !== null ? toSigned(value, bitWidth).toString() : "—");

  const binGrouped = $derived(binView === "—" ? binView : binView.padStart(bitWidth, "0").replace(/(.{4})/g, "$1 ").trim());

  // --- IEEE-754 float viewer ---
  let floatText = $state("3.14");
  let precision: 32 | 64 = $state(32);

  function floatBits(value: number, bits: 32 | 64): string {
    if (bits === 32) {
      const buf = new ArrayBuffer(4);
      const dv = new DataView(buf);
      dv.setFloat32(0, value);
      return dv.getUint32(0).toString(2).padStart(32, "0");
    }
    const buf = new ArrayBuffer(8);
    const dv = new DataView(buf);
    dv.setFloat64(0, value);
    return dv.getBigUint64(0).toString(2).padStart(64, "0");
  }

  const parsedFloat = $derived.by(() => {
    const n = Number(floatText);
    return Number.isNaN(n) && floatText.trim() !== "nan" ? null : n;
  });

  const bitString = $derived(parsedFloat !== null ? floatBits(parsedFloat, precision) : "");
  const expBits = $derived(precision === 32 ? 8 : 11);
  const mantBits = $derived(precision === 32 ? 23 : 52);
  const bias = $derived(precision === 32 ? 127 : 1023);

  const signBit = $derived(bitString ? bitString[0] : "");
  const exponentBits = $derived(bitString ? bitString.slice(1, 1 + expBits) : "");
  const mantissaBits = $derived(bitString ? bitString.slice(1 + expBits) : "");
  const exponentValue = $derived(exponentBits ? parseInt(exponentBits, 2) - bias : 0);

  function onFloatKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="base-tile">
  <section>
    <div class="section-head">
      <h3>Integer base converter</h3>
      <div class="base-tabs">
        {#each [2, 8, 10, 16] as b (b)}
          <button type="button" class:active={base === b} onclick={() => (base = b as Base)}>
            {b === 2 ? "BIN" : b === 8 ? "OCT" : b === 10 ? "DEC" : "HEX"}
          </button>
        {/each}
      </div>
      <div class="width-tabs">
        {#each [8, 16, 32, 64] as w (w)}
          <button type="button" class:active={bitWidth === w} onclick={() => (bitWidth = w as BitWidth)}>{w}-bit</button>
        {/each}
      </div>
    </div>
    <input
      bind:this={inputEl}
      bind:value={text}
      onkeydown={onKeydown}
      spellcheck="false"
      autocomplete="off"
      class="value-input"
    />
    <div class="views">
      <div><span class="label">BIN</span><span class="mono">{binGrouped}</span></div>
      <div><span class="label">OCT</span><span class="mono">{octView}</span></div>
      <div><span class="label">DEC</span><span class="mono">{decView}</span> <span class="dim">(signed {signedView})</span></div>
      <div><span class="label">HEX</span><span class="mono">{hexView}</span></div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <h3>IEEE-754 float viewer</h3>
      <div class="width-tabs">
        <button type="button" class:active={precision === 32} onclick={() => (precision = 32)}>single (32)</button>
        <button type="button" class:active={precision === 64} onclick={() => (precision = 64)}>double (64)</button>
      </div>
    </div>
    <input bind:value={floatText} onkeydown={onFloatKeydown} spellcheck="false" autocomplete="off" class="value-input" />
    {#if bitString}
      <div class="bitfield">
        <span class="bit sign" title="sign">{signBit}</span>
        <span class="bit exp" title="exponent">{exponentBits}</span>
        <span class="bit mant" title="mantissa">{mantissaBits}</span>
      </div>
      <div class="legend">
        <span class="chip sign">sign = {signBit}</span>
        <span class="chip exp">exponent = {exponentBits} ({exponentValue} unbiased)</span>
        <span class="chip mant">mantissa = {mantissaBits.length > 24 ? mantissaBits.slice(0, 24) + "…" : mantissaBits}</span>
      </div>
      <div class="dim">value ≈ {parsedFloat}</div>
    {/if}
  </section>
</div>

<style>
  .base-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.75rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
    overflow-y: auto;
  }
  h3 {
    margin: 0;
    font-size: 0.82rem;
    opacity: 0.8;
  }
  .section-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-bottom: 0.4rem;
  }
  .base-tabs,
  .width-tabs {
    display: flex;
    gap: 0.25rem;
  }
  button {
    font: inherit;
    font-size: 0.72rem;
    padding: 0.2rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  button.active {
    background: var(--accent);
    color: var(--background);
    border-color: var(--accent);
  }
  .value-input {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    font-size: 1.1rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.35rem 0.55rem;
    outline: none;
    margin-bottom: 0.5rem;
  }
  .value-input:focus {
    border-color: var(--accent);
  }
  .views {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem 0.6rem;
  }
  .label {
    display: inline-block;
    width: 3rem;
    opacity: 0.55;
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .dim {
    opacity: 0.55;
    font-size: 0.78rem;
  }
  .bitfield {
    display: flex;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.85rem;
    letter-spacing: 0.02em;
    overflow-x: auto;
    white-space: nowrap;
    margin-bottom: 0.4rem;
  }
  .bit.sign {
    color: var(--error);
  }
  .bit.exp {
    color: #f9e2af;
  }
  .bit.mant {
    color: #89b4fa;
  }
  .legend {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.72rem;
    margin-bottom: 0.3rem;
  }
  .chip {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
  }
  .chip.sign {
    color: var(--error);
  }
  .chip.exp {
    color: #f9e2af;
  }
  .chip.mant {
    color: #89b4fa;
  }
</style>
