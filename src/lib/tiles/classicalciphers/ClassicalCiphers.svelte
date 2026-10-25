<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { vigenereEncode, vigenereDecode, atbash, railFenceEncode, railFenceDecode } from "./ciphers";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Mode = "vigenere" | "atbash" | "railfence";
  let mode: Mode = $state("vigenere");
  let input = $state("Attack at dawn");
  let key = $state("lemon");
  let rails = $state(3);
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
    if (mode === "vigenere") return tryRun(() => vigenereEncode(input, key));
    if (mode === "atbash") return tryRun(() => atbash(input));
    return tryRun(() => railFenceEncode(input, rails));
  });

  const decoded = $derived.by(() => {
    if (mode === "vigenere") return tryRun(() => vigenereDecode(input, key));
    if (mode === "atbash") return tryRun(() => atbash(input));
    return tryRun(() => railFenceDecode(input, rails));
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="cipher-tile">
  <div class="mode-tabs">
    <button type="button" class:active={mode === "vigenere"} onclick={() => (mode = "vigenere")}>Vigenere</button>
    <button type="button" class:active={mode === "atbash"} onclick={() => (mode = "atbash")}>Atbash</button>
    <button type="button" class:active={mode === "railfence"} onclick={() => (mode = "railfence")}>Rail Fence</button>
  </div>

  {#if mode === "vigenere"}
    <label class="param">
      keyword
      <input bind:value={key} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
    </label>
  {:else if mode === "railfence"}
    <label class="param">rails <input type="number" min="2" max="12" bind:value={rails} /></label>
  {:else}
    <p class="note">Atbash reverses the alphabet (A&lt;-&gt;Z, B&lt;-&gt;Y, ...) - the same operation encodes and decodes.</p>
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
  {#if mode !== "atbash"}
    <div class="result">
      <div class="result-label">Decode</div>
      {#if decoded.error}<div class="error">{decoded.error}</div>{:else}<pre>{decoded.value}</pre>{/if}
    </div>
  {/if}
</div>

<style>
  .cipher-tile {
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
    overflow-y: auto;
  }
  .mode-tabs {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  button {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.25rem 0.6rem;
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
    opacity: 0.85;
  }
  .param input {
    font: inherit;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.4rem;
    width: 7rem;
  }
  .note {
    margin: 0;
    opacity: 0.55;
    font-size: 0.72rem;
  }
  textarea {
    width: 100%;
    min-height: 3.5rem;
    resize: vertical;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.5rem;
    box-sizing: border-box;
  }
  .result {
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem;
  }
  .result-label {
    font-size: 0.68rem;
    opacity: 0.55;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.3rem;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.8rem;
  }
  .error {
    color: var(--error);
    font-size: 0.75rem;
  }
</style>
