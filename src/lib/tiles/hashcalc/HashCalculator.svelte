<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { md5, webCryptoHash, crc32, type WebCryptoAlgo } from "../../util/hash";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let text = $state("The quick brown fox jumps over the lazy dog");
  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let copied: string | null = $state(null);

  $effect(() => {
    if (focused) queueMicrotask(() => textareaEl?.focus());
  });

  interface HashResult {
    label: string;
    value: string;
  }
  let results: HashResult[] = $state([]);

  const algos: WebCryptoAlgo[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

  $effect(() => {
    const current = text;
    (async () => {
      const out: HashResult[] = [{ label: "CRC32", value: crc32(current) }, { label: "MD5", value: md5(current) }];
      for (const algo of algos) {
        out.push({ label: algo, value: await webCryptoHash(current, algo) });
      }
      results = out;
    })();
  });

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      copied = value;
      setTimeout(() => (copied = null), 1200);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="hash-tile">
  <textarea
    bind:this={textareaEl}
    bind:value={text}
    onkeydown={onKeydown}
    onfocus={() => vimState.enterInsert()}
    onblur={() => vimState.enterNormal()}
    spellcheck="false"
    placeholder="Text to hash..."
  ></textarea>
  <ul class="results">
    {#each results as r (r.label)}
      <li>
        <span class="label">{r.label}</span>
        <button type="button" class="hash-value" onclick={() => copy(r.value)} title="Click to copy">
          {r.value}
          {#if copied === r.value}<span class="copied">copied</span>{/if}
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .hash-tile {
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
  textarea {
    height: 4.5rem;
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
  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    overflow-y: auto;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .label {
    width: 4.5rem;
    flex-shrink: 0;
    opacity: 0.6;
    font-size: 0.75rem;
  }
  .hash-value {
    flex: 1;
    text-align: left;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    word-break: break-all;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
    cursor: pointer;
  }
  .copied {
    margin-left: 0.5rem;
    color: var(--success);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
  }
</style>
