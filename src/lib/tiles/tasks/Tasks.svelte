<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { tasksStore } from "./store.svelte";
  import type { Recurrence } from "./types";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let listEl: HTMLUListElement | undefined = $state();
  let pendingDelete = $state(false);
  let pendingDeleteTimer: ReturnType<typeof setTimeout> | null = null;

  let adding = $state(false);
  let newTitle = $state("");
  let newProject = $state("");
  let newTags = $state("");
  let newDue = $state("");
  let newRecurrence: Recurrence = $state(null);
  let titleInputEl: HTMLInputElement | undefined = $state();

  tasksStore.refresh();

  $effect(() => {
    if (focused && !adding) {
      queueMicrotask(() => listEl?.focus());
    }
  });

  function today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function isOverdue(due: string | null, completed: boolean): boolean {
    return !completed && !!due && due < today();
  }

  function openAddForm() {
    adding = true;
    newTitle = "";
    newProject = "";
    newTags = "";
    newDue = "";
    newRecurrence = null;
    queueMicrotask(() => titleInputEl?.focus());
  }

  async function confirmAdd() {
    const title = newTitle.trim();
    if (!title) {
      adding = false;
      return;
    }
    adding = false;
    await tasksStore.add({
      title,
      project: newProject.trim() || null,
      tags: newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      due_date: newDue || null,
      recurrence: newRecurrence,
    });
  }

  function cancelAdd() {
    adding = false;
  }

  function onListKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;

    if (e.key === "j") {
      e.preventDefault();
      e.stopPropagation();
      tasksStore.moveSelection(1);
      return;
    }
    if (e.key === "k") {
      e.preventDefault();
      e.stopPropagation();
      tasksStore.moveSelection(-1);
      return;
    }
    if (e.key === "x") {
      e.preventDefault();
      e.stopPropagation();
      void tasksStore.toggleSelected();
      return;
    }
    if (e.key === "a") {
      e.preventDefault();
      e.stopPropagation();
      openAddForm();
      return;
    }
    if (e.key === "d") {
      e.preventDefault();
      e.stopPropagation();
      if (pendingDelete) {
        pendingDelete = false;
        if (pendingDeleteTimer) clearTimeout(pendingDeleteTimer);
        void tasksStore.deleteSelected();
      } else {
        pendingDelete = true;
        pendingDeleteTimer = setTimeout(() => (pendingDelete = false), 600);
      }
      return;
    }
    e.stopPropagation();
  }

  function onTitleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") confirmAdd();
    else if (e.key === "Escape") {
      e.preventDefault();
      cancelAdd();
    }
  }
</script>

<div class="tasks-tile">
  <div class="toolbar">
    <select
      bind:value={tasksStore.projectFilter}
      onfocus={() => vimState.enterInsert()}
      onblur={() => vimState.enterNormal()}
    >
      <option value={null}>All projects</option>
      {#each tasksStore.projects as p (p)}
        <option value={p}>{p}</option>
      {/each}
    </select>
    <div class="tag-chips">
      <button type="button" class:active={tasksStore.tagFilter === null} onclick={() => (tasksStore.tagFilter = null)}>
        all tags
      </button>
      {#each tasksStore.tags as tag (tag)}
        <button type="button" class:active={tasksStore.tagFilter === tag} onclick={() => (tasksStore.tagFilter = tag)}>
          #{tag}
        </button>
      {/each}
    </div>
    <span class="spacer"></span>
    <button type="button" onclick={openAddForm}>+ Add (a)</button>
  </div>

  {#if adding}
    <div class="add-form">
      <input
        bind:this={titleInputEl}
        bind:value={newTitle}
        placeholder="Task title..."
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
        onkeydown={onTitleKeydown}
        spellcheck="false"
      />
      <input
        bind:value={newProject}
        placeholder="Project (optional)"
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
        onkeydown={onTitleKeydown}
        spellcheck="false"
      />
      <input
        bind:value={newTags}
        placeholder="tags, comma, separated"
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
        onkeydown={onTitleKeydown}
        spellcheck="false"
      />
      <input
        type="date"
        bind:value={newDue}
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
        onkeydown={onTitleKeydown}
      />
      <select
        bind:value={newRecurrence}
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
        onkeydown={onTitleKeydown}
      >
        <option value={null}>No repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <button type="button" onclick={confirmAdd}>Create</button>
      <button type="button" onclick={cancelAdd}>Cancel</button>
    </div>
  {/if}

  <ul
    class="task-list"
    role="listbox"
    aria-label="Tasks"
    bind:this={listEl}
    tabindex="0"
    onkeydown={onListKeydown}
    onfocus={() => (pendingDelete = false)}
  >
    {#each tasksStore.filtered as task, i (task.id)}
      <li role="option" aria-selected={i === tasksStore.selected} class:selected={i === tasksStore.selected} class:completed={task.completed}>
        <span class="check">{task.completed ? "☑" : "☐"}</span>
        <span class="title">{task.title}</span>
        {#if task.recurrence}<span class="badge recur">↻ {task.recurrence}</span>{/if}
        {#if task.project}<span class="badge project">{task.project}</span>{/if}
        {#each task.tags as tag (tag)}<span class="badge tag">#{tag}</span>{/each}
        {#if task.due_date}
          <span class="due" class:overdue={isOverdue(task.due_date, task.completed)}>{task.due_date}</span>
        {/if}
      </li>
    {/each}
    {#if tasksStore.filtered.length === 0}
      <li class="empty">No tasks. Press "a" or click + Add.</li>
    {/if}
  </ul>

  <div class="hint">j/k: move &middot; x: toggle done &middot; dd: delete &middot; a: add</div>
</div>

<style>
  .tasks-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.85rem;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .spacer {
    flex: 1;
  }

  select,
  input {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.25rem 0.4rem;
  }
  input:focus,
  select:focus {
    outline: none;
    border-color: var(--accent);
  }

  button {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.25rem 0.55rem;
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

  .tag-chips {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .tag-chips button {
    font-size: 0.7rem;
    padding: 0.15rem 0.4rem;
  }

  .add-form {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
    padding: 0.4rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
  }
  .add-form input:not([type]) {
    flex: 1;
    min-width: 8rem;
  }

  .task-list {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    outline: none;
  }
  .task-list li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
  }
  .task-list li.selected {
    background: rgba(255, 255, 255, 0.08);
    outline: 1px solid var(--accent);
  }
  .task-list li.completed .title {
    text-decoration: line-through;
    opacity: 0.5;
  }
  .task-list li.empty {
    opacity: 0.5;
  }
  .check {
    opacity: 0.8;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  .badge {
    font-size: 0.7rem;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    opacity: 0.85;
    white-space: nowrap;
  }
  .badge.project {
    background: rgba(203, 166, 247, 0.18);
  }
  .due {
    font-size: 0.72rem;
    opacity: 0.6;
    white-space: nowrap;
  }
  .due.overdue {
    color: var(--error);
    opacity: 1;
  }

  .hint {
    font-size: 0.7rem;
    opacity: 0.45;
  }
</style>
