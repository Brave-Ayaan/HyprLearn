<script lang="ts" module>
  export interface ReferenceEntry {
    id: string;
    title: string;
    category: string;
    tags?: string[];
    summary?: string;
    latex?: string;
    body: string;
    monospace?: boolean;
  }
</script>

<script lang="ts">
  import { vimState } from "../vim/stateMachine.svelte";
  import { fuzzyScore } from "../util/fuzzy";
  import Katex from "./Katex.svelte";

  let {
    entries,
    focused = false,
    emptyHint = "Nothing here yet.",
  }: { entries: ReferenceEntry[]; focused?: boolean; emptyHint?: string } = $props();

  let query = $state("");
  let activeCategory: string | null = $state(null);
  let selected = $state(0);
  let listEl: HTMLUListElement | undefined = $state();

  const categories = $derived.by(() => [...new Set(entries.map((e) => e.category))].sort());

  const filtered = $derived.by(() => {
    let list = entries;
    if (activeCategory) list = list.filter((e) => e.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list
      .map((e) => ({ e, score: fuzzyScore(q, `${e.title} ${e.summary ?? ""} ${(e.tags ?? []).join(" ")}`.toLowerCase()) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.e);
  });

  $effect(() => {
    if (selected >= filtered.length) selected = Math.max(0, filtered.length - 1);
  });

  const current = $derived(filtered[selected]);

  $effect(() => {
    if (focused) queueMicrotask(() => listEl?.focus());
  });

  function onListKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    if (e.key === "j") {
      e.preventDefault();
      e.stopPropagation();
      selected = Math.min(selected + 1, filtered.length - 1);
      return;
    }
    if (e.key === "k") {
      e.preventDefault();
      e.stopPropagation();
      selected = Math.max(selected - 1, 0);
      return;
    }
    e.stopPropagation();
  }
</script>

<div class="ref-browser">
  <aside class="sidebar">
    <input
      placeholder="Search..."
      bind:value={query}
      onfocus={() => vimState.enterInsert()}
      onblur={() => vimState.enterNormal()}
      spellcheck="false"
    />
    {#if categories.length > 1}
      <div class="chips">
        <button type="button" class:active={activeCategory === null} onclick={() => (activeCategory = null)}>all</button>
        {#each categories as cat (cat)}
          <button type="button" class:active={activeCategory === cat} onclick={() => (activeCategory = cat)}>{cat}</button>
        {/each}
      </div>
    {/if}
    <ul role="listbox" aria-label="Entries" bind:this={listEl} tabindex="0" onkeydown={onListKeydown}>
      {#each filtered as entry, i (entry.id)}
        <li role="option" aria-selected={i === selected}>
          <button type="button" class:selected={i === selected} onclick={() => (selected = i)}>
            {entry.title}
          </button>
        </li>
      {/each}
      {#if filtered.length === 0}
        <li class="empty">{emptyHint}</li>
      {/if}
    </ul>
  </aside>
  <main class="detail">
    {#if current}
      <h2>{current.title}</h2>
      {#if current.latex}
        <div class="latex"><Katex tex={current.latex} display={true} /></div>
      {/if}
      <p class="body" class:monospace={current.monospace}>{current.body}</p>
      {#if current.tags?.length}
        <div class="tags">
          {#each current.tags as tag (tag)}<span class="tag">#{tag}</span>{/each}
        </div>
      {/if}
    {:else}
      <p class="hint">No entry selected.</p>
    {/if}
  </main>
</div>

<style>
  .ref-browser {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
  }
  .sidebar {
    width: 230px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
  }
  .sidebar input {
    font: inherit;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
  }
  .sidebar input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chips button,
  .sidebar ul button {
    font: inherit;
  }
  .chips button {
    font-size: 0.7rem;
    padding: 0.15rem 0.45rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .chips button.active {
    background: var(--accent);
    color: var(--background);
    border-color: var(--accent);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
    outline: none;
  }
  ul button {
    width: 100%;
    text-align: left;
    font-size: 0.82rem;
    border: none;
    background: transparent;
    color: var(--fg);
    padding: 0.35rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    cursor: pointer;
  }
  ul button.selected {
    background: rgba(255, 255, 255, 0.08);
    outline: 1px solid var(--accent);
  }
  li.empty {
    opacity: 0.5;
    font-size: 0.8rem;
    padding: 0.4rem 0.5rem;
  }
  .detail {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.25rem;
  }
  .detail h2 {
    margin: 0 0 0.6rem;
    font-size: 1.1rem;
  }
  .latex {
    margin: 0.5rem 0 0.8rem;
    font-size: 1.1rem;
  }
  .body {
    white-space: pre-wrap;
    line-height: 1.6;
    font-size: 0.9rem;
    opacity: 0.9;
  }
  .body.monospace {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.82rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.6rem 0.75rem;
    overflow-x: auto;
  }
  .tags {
    margin-top: 0.75rem;
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .tag {
    font-size: 0.7rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
  }
  .hint {
    opacity: 0.5;
  }
</style>
