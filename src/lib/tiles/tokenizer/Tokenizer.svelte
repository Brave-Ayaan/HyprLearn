<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { getModel, encode, type BpeModel } from "./bpe";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let model: BpeModel | null = $state(null);
  let text = $state("The quick brown fox jumps over the lazy dog, running and jumping through the forest.");
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  setTimeout(() => {
    model = getModel();
  }, 0);

  $effect(() => {
    if (focused) queueMicrotask(() => textareaEl?.focus());
  });

  const tokens = $derived.by(() => (model ? encode(text, model) : []));

  const PALETTE = ["#cba6f7", "#89b4fa", "#a6e3a1", "#f9e2af", "#fab387", "#f38ba8", "#94e2d5"];

  function display(tok: string): string {
    return tok.replace(/ /g, "·").replace(/\n/g, "↵");
  }

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="tok-tile">
  {#if !model}
    <div class="loading">Training local BPE vocabulary from a bundled synthetic corpus...</div>
  {:else}
    <textarea
      bind:this={textareaEl}
      bind:value={text}
      onkeydown={onKeydown}
      onfocus={() => vimState.enterInsert()}
      onblur={() => vimState.enterNormal()}
      spellcheck="false"
    ></textarea>

    <div class="stats">
      <span>{tokens.length} tokens</span>
      <span>{text.length} chars</span>
      <span>{tokens.length ? (text.length / tokens.length).toFixed(2) : "0"} chars/token</span>
      <span class="dim">vocab size {model.vocabSize}</span>
    </div>

    <div class="tokens">
      {#each tokens as tok, i (i)}
        <span class="chip" style="background: {PALETTE[i % PALETTE.length]}33; color: {PALETTE[i % PALETTE.length]};">{display(tok)}</span>
      {/each}
    </div>

    <p class="disclaimer">
      Approximate: a real byte-pair-encoding tokenizer trained locally on a small bundled synthetic corpus, not a
      byte-for-byte match for a production tokenizer like GPT's cl100k_base. No network access, ever.
    </p>
  {/if}
</div>

<style>
  .tok-tile {
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
  }
  .loading {
    margin: auto;
    opacity: 0.6;
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
  .stats {
    display: flex;
    gap: 0.8rem;
    font-size: 0.75rem;
    opacity: 0.8;
  }
  .dim {
    opacity: 0.6;
  }
  .tokens {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem;
    align-content: flex-start;
    background: rgba(255, 255, 255, 0.02);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem;
  }
  .chip {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    white-space: pre;
  }
  .disclaimer {
    margin: 0;
    opacity: 0.45;
    font-size: 0.7rem;
  }
</style>
