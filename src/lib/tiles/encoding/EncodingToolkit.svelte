<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { base64Encode, base64Decode, urlEncode, urlDecode, hexEncode, hexDecode, caesar, xorHexEncode, xorHexDecode } from "./codecs";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Mode = "base64" | "url" | "hex" | "caesar" | "xor";
  let mode: Mode = $state("base64");
  let input = $state("Hello, world!");
  let shift = $state(13);
  let xorKey = $state("key");
  let inputEl: HTMLTextAreaElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  function tryRun(fn: () => string): { value: string; error: string | null } {
    try {
      return { value: fn(), error: null };
    } catch (err) {
      return { value: "", error: err instanceof Error ? err.message : "Error" };
    }
  }

  const encoded = $derived.by(() => {
    if (mode === "base64") return tryRun(() => base64Encode(input));
    if (mode === "url") return tryRun(() => urlEncode(input));
    if (mode === "hex") return tryRun(() => hexEncode(input));
    if (mode === "caesar") return tryRun(() => caesar(input, shift));
    return tryRun(() => xorHexEncode(input, xorKey));
  });

  const decoded = $derived.by(() => {
    if (mode === "base64") return tryRun(() => base64Decode(input));
    if (mode === "url") return tryRun(() => urlDecode(input));
    if (mode === "hex") return tryRun(() => hexDecode(input));
    if (mode === "caesar") return tryRun(() => caesar(input, -shift));
    return tryRun(() => xorHexDecode(input, xorKey));
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="enc-tile">
  <div class="mode-tabs">
    <button type="button" class:active={mode === "base64"} onclick={() => (mode = "base64")}>Base64</button>
    <button type="button" class:active={mode === "url"} onclick={() => (mode = "url")}>URL</button>
    <button type="button" class:active={mode === "hex"} onclick={() => (mode = "hex")}>Hex</button>
    <button type="button" class:active={mode === "caesar"} onclick={() => (mode = "caesar")}>ROT13 / Caesar</button>
    <button type="button" class:active={mode === "xor"} onclick={() => (mode = "xor")}>XOR</button>
  </div>

  {#if mode === "caesar"}
    <label class="param">shift <input type="number" bind:value={shift} /> <button type="button" onclick={() => (shift = 13)}>ROT13</button></label>
  {:else if mode === "xor"}
    <label class="param">
      key
      <input bind:value={xorKey} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
    </label>
  {/if}

  <textarea
    bind:this={inputEl}
    bind:value={input}
    onkeydown={onKeydown}
    onfocus={() => vimState.enterInsert()}
    onblur={() => vimState.enterNormal()}
    spellcheck="false"
    placeholder="Input..."
  ></textarea>

  <div class="result">
    <div class="result-label">Encode</div>
    {#if encoded.error}<div class="error">{encoded.error}</div>{:else}<pre>{encoded.value}</pre>{/if}
  </div>
  <div class="result">
    <div class="result-label">Decode</div>
    {#if decoded.error}<div class="error">{decoded.error}</div>{:else}<pre>{decoded.value}</pre>{/if}
  </div>
</div>

<style>
  .enc-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.7rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
    overflow-y: auto;
  }
  .mode-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  button {
    font: inherit;
    font-size: 0.74rem;
    padding: 0.22rem 0.5rem;
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
  .param {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
  }
  .param input {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.4rem;
  }
  textarea {
    height: 3.5rem;
    resize: vertical;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.4rem 0.5rem;
    outline: none;
  }
  textarea:focus {
    border-color: var(--accent);
  }
  .result-label {
    font-size: 0.7rem;
    opacity: 0.55;
    margin-bottom: 0.15rem;
  }
  pre {
    margin: 0;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.4rem 0.5rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .error {
    color: var(--error);
    font-size: 0.78rem;
  }
</style>
