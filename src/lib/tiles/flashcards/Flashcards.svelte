<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { flashcardsStore } from "./store.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let view: "study" | "manage" = $state("study");
  let newFront = $state("");
  let newBack = $state("");
  let newTags = $state("");
  let adding = $state(false);
  let hostEl: HTMLDivElement | undefined = $state();

  flashcardsStore.refresh();

  const current = $derived(flashcardsStore.due[flashcardsStore.studyIndex] ?? null);

  async function confirmAdd() {
    if (!newFront.trim() || !newBack.trim()) return;
    await flashcardsStore.add(
      newFront.trim(),
      newBack.trim(),
      newTags.split(",").map((t) => t.trim()).filter(Boolean),
    );
    newFront = "";
    newBack = "";
    newTags = "";
    adding = false;
  }

  function onCardKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    if (!current) return;
    if (!flashcardsStore.revealed) {
      if (e.key === "Enter" || e.key === "j") {
        e.preventDefault();
        e.stopPropagation();
        flashcardsStore.reveal();
      }
      return;
    }
    const map: Record<string, number> = { "1": 1, "2": 3, "3": 4, "4": 5 };
    if (map[e.key] !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      void flashcardsStore.grade(map[e.key]);
    }
  }

  $effect(() => {
    if (focused) queueMicrotask(() => hostEl?.focus());
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="fc-tile" role="application" aria-label="Flashcards" bind:this={hostEl} tabindex="0" onkeydown={onCardKeydown}>
  <div class="toolbar">
    <button type="button" class:active={view === "study"} onclick={() => (view = "study")}>Study ({flashcardsStore.due.length} due)</button>
    <button type="button" class:active={view === "manage"} onclick={() => (view = "manage")}>Manage ({flashcardsStore.all.length})</button>
  </div>

  {#if view === "study"}
    {#if current}
      <div class="card">
        <div class="card-face front">{current.front}</div>
        {#if flashcardsStore.revealed}
          <div class="card-face back">{current.back}</div>
          <div class="grade-row">
            <button type="button" onclick={() => flashcardsStore.grade(1)}>Again (1)</button>
            <button type="button" onclick={() => flashcardsStore.grade(3)}>Hard (2)</button>
            <button type="button" onclick={() => flashcardsStore.grade(4)}>Good (3)</button>
            <button type="button" onclick={() => flashcardsStore.grade(5)}>Easy (4)</button>
          </div>
        {:else}
          <button type="button" class="reveal" onclick={() => flashcardsStore.reveal()}>Show answer (Enter)</button>
        {/if}
      </div>
    {:else}
      <div class="empty">Nothing due right now. Add cards in Manage, or come back later.</div>
    {/if}
  {:else}
    <div class="manage">
      {#if adding}
        <div class="add-form">
          <input bind:value={newFront} placeholder="Front" onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
          <input bind:value={newBack} placeholder="Back" onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
          <input bind:value={newTags} placeholder="tags, comma, separated" onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
          <button type="button" onclick={confirmAdd}>Create</button>
          <button type="button" onclick={() => (adding = false)}>Cancel</button>
        </div>
      {:else}
        <button type="button" onclick={() => (adding = true)}>+ New card</button>
      {/if}
      <ul class="card-list">
        {#each flashcardsStore.all as c (c.id)}
          <li>
            <span class="front-text">{c.front}</span>
            <span class="dim">→ {c.back}</span>
            <span class="dim">rep {c.repetitions}, ease {c.ease.toFixed(2)}</span>
            <button type="button" class="danger" onclick={() => flashcardsStore.remove(c.id)}>×</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .fc-tile {
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
    outline: none;
  }
  .toolbar {
    display: flex;
    gap: 0.4rem;
  }
  button {
    font: inherit;
    font-size: 0.78rem;
    padding: 0.3rem 0.6rem;
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
  .card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }
  .card-face {
    font-size: 1.3rem;
    text-align: center;
    padding: 1rem 1.5rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: var(--radius);
    max-width: 80%;
  }
  .card-face.back {
    color: var(--accent);
  }
  .grade-row {
    display: flex;
    gap: 0.5rem;
  }
  .empty {
    margin: auto;
    opacity: 0.55;
  }
  .manage {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
  }
  .add-form {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .add-form input {
    flex: 1;
    min-width: 8rem;
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.25rem 0.5rem;
  }
  .card-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .card-list li {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.3rem 0.4rem;
    border-radius: calc(var(--radius) - 2px);
    background: rgba(255, 255, 255, 0.02);
  }
  .front-text {
    font-weight: 600;
  }
  .dim {
    opacity: 0.55;
    font-size: 0.75rem;
  }
  .danger {
    margin-left: auto;
    border-color: rgba(243, 139, 168, 0.4);
    color: var(--error);
  }
</style>
