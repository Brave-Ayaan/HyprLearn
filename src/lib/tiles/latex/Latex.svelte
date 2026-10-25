<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import Katex from "../../components/Katex.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let source = $state(
    "% LaTeX scratchpad - lines starting with % are plain notes, everything else renders as display math\n% Press Ctrl+Space then :layout to switch WM layout; this tile is purely local, nothing leaves the app.\nE = mc^2\n\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}",
  );

  let textareaEl: HTMLTextAreaElement | undefined = $state();

  const lines = $derived(source.split("\n"));

  $effect(() => {
    if (focused) queueMicrotask(() => textareaEl?.focus());
  });
</script>

<div class="latex-tile">
  <textarea
    bind:this={textareaEl}
    bind:value={source}
    onfocus={() => vimState.enterInsert()}
    onblur={() => vimState.enterNormal()}
    spellcheck="false"
    placeholder="Type LaTeX, one expression per line. Lines starting with % are notes."
  ></textarea>
  <div class="preview">
    {#each lines as line, i (i)}
      {#if line.trim().startsWith("%")}
        <p class="note">{line.trim().slice(1).trim()}</p>
      {:else if line.trim()}
        <div class="formula"><Katex tex={line} display={true} /></div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .latex-tile {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
  }
  textarea {
    flex: 1;
    min-width: 0;
    resize: none;
    border: none;
    outline: none;
    background: rgba(255, 255, 255, 0.02);
    color: var(--fg);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    padding: 0.75rem;
    box-sizing: border-box;
  }
  .preview {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }
  .note {
    opacity: 0.55;
    font-size: 0.82rem;
    margin: 0.3rem 0;
  }
  .formula {
    margin: 0.6rem 0;
    font-size: 1.1rem;
    overflow-x: auto;
  }
</style>
