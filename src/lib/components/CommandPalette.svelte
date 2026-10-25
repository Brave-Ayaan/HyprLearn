<script lang="ts">
  import { actionRegistry, dispatchAction, commandHintFor } from "../actions/registry";
  import { paletteState } from "../actions/paletteState.svelte";
  import { fuzzyScore } from "../util/fuzzy";

  let query = $state("");
  let selected = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();

  const allActions = Array.from(actionRegistry.values());

  const results = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allActions.slice(0, 20);
    return allActions
      .map((action) => ({ action, score: fuzzyScore(q, `${action.name} ${action.description}`.toLowerCase()) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((r) => r.action);
  });


  function runSelected() {
    const action = results[selected];
    if (action) dispatchAction(action.name);
    close();
  }

  function close() {
    paletteState.hide();
    query = "";
    selected = 0;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selected = Math.min(selected + 1, results.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runSelected();
    }
  }

  $effect(() => {
    if (paletteState.open) {
      selected = 0;
      queueMicrotask(() => inputEl?.focus());
    }
  });
</script>

{#if paletteState.open}
  <div class="overlay">
    <button class="backdrop" aria-label="Close command palette" onclick={close}></button>
    <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <input
        bind:this={inputEl}
        bind:value={query}
        onkeydown={onKeydown}
        placeholder="Type a command..."
        spellcheck="false"
      />
      <ul role="listbox">
        {#each results as action, i (action.name)}
          <li role="option" aria-selected={i === selected} class:active={i === selected}>
            <button type="button" onmousedown={() => { selected = i; runSelected(); }}>
              <span class="desc">{action.description} <span class="hint">({commandHintFor(action.description)})</span></span>
              <span class="name">{action.name}</span>
            </button>
          </li>
        {/each}
        {#if results.length === 0}
          <li class="empty">No matching commands</li>
        {/if}
      </ul>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
    z-index: 100;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    border: none;
    padding: 0;
    cursor: default;
  }
  .palette {
    position: relative;
    width: min(560px, 90vw);
    background: var(--panel-bg);
    border-radius: var(--radius);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.85rem 1rem;
    font-size: 1rem;
    background: transparent;
    color: var(--fg);
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    outline: none;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0.25rem;
    max-height: 50vh;
    overflow-y: auto;
  }
  li {
    border-radius: calc(var(--radius) - 2px);
  }
  li button {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    border-radius: calc(var(--radius) - 2px);
    cursor: pointer;
    color: var(--fg);
    font: inherit;
    text-align: left;
  }
  li.active button {
    background: var(--accent);
    color: var(--background);
  }
  li.empty {
    opacity: 0.6;
    padding: 0.5rem 0.75rem;
    cursor: default;
  }
  .desc {
    font-size: 0.85rem;
  }
  .hint {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    opacity: 0.45;
  }
  .name {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    opacity: 0.45;
    text-align: right;
  }
</style>
