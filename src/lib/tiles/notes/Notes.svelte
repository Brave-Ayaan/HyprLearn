<script lang="ts">
  import { onDestroy } from "svelte";
  import { marked } from "marked";
  import type { EditorView } from "@codemirror/view";
  import { vimState } from "../../vim/stateMachine.svelte";
  import { notesStore } from "./store.svelte";
  import { createEditor, replaceDoc } from "./editor";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let editorContainer: HTMLDivElement | undefined = $state();
  let view: EditorView | undefined;
  let showPreview = $state(false);
  let creatingNote = $state(false);
  let newTitle = $state("");
  let newTitleInput: HTMLInputElement | undefined = $state();

  notesStore.refreshList();

  onDestroy(() => {
    view?.destroy();
  });

  $effect(() => {
    if (editorContainer && !view) {
      view = createEditor({
        doc: notesStore.content,
        parent: editorContainer,
        onChange: (doc) => notesStore.setContent(doc),
      });
    }
  });

  $effect(() => {
    // Re-syncs the editor's document whenever the store's content changes
    // out from under it (switching notes, loading from disk). A no-op
    // while the user is typing, since the view is the source of that change.
    const content = notesStore.content;
    if (view) replaceDoc(view, content);
  });

  $effect(() => {
    if (focused && view) {
      queueMicrotask(() => view?.focus());
    }
  });

  const previewHtml = $derived.by(() => (showPreview ? (marked.parse(notesStore.content) as string) : ""));

  function startCreate() {
    creatingNote = true;
    newTitle = "";
    queueMicrotask(() => newTitleInput?.focus());
  }

  async function confirmCreate() {
    const title = newTitle.trim() || "Untitled";
    creatingNote = false;
    await notesStore.createAndOpen(title);
  }

  function cancelCreate() {
    creatingNote = false;
  }

  function onNewTitleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelCreate();
    }
  }
</script>

<div class="notes-tile">
  <aside class="sidebar">
    <div class="sidebar-header">
      <input
        placeholder="Search notes..."
        bind:value={notesStore.searchQuery}
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
        spellcheck="false"
      />
      <button type="button" onclick={startCreate}>+ New</button>
    </div>

    {#if creatingNote}
      <div class="create-row">
        <input
          bind:this={newTitleInput}
          bind:value={newTitle}
          placeholder="Note title..."
          onfocus={() => vimState.enterInsert()}
          onblur={() => vimState.enterNormal()}
          onkeydown={onNewTitleKeydown}
          spellcheck="false"
        />
        <button type="button" onclick={confirmCreate}>Create</button>
      </div>
    {/if}

    {#if notesStore.allTags.length > 0}
      <div class="tag-chips">
        <button type="button" class:active={notesStore.activeTag === null} onclick={() => (notesStore.activeTag = null)}>
          all
        </button>
        {#each notesStore.allTags as tag (tag)}
          <button type="button" class:active={notesStore.activeTag === tag} onclick={() => (notesStore.activeTag = tag)}>
            #{tag}
          </button>
        {/each}
      </div>
    {/if}

    <ul class="note-list">
      {#each notesStore.filtered as note (note.name)}
        <li class:active={note.name === notesStore.currentName}>
          <button type="button" onclick={() => notesStore.open(note.name)}>
            <span class="note-title">{note.name.replace(/\.md$/, "")}</span>
            {#if note.preview}<span class="note-preview">{note.preview}</span>{/if}
          </button>
        </li>
      {/each}
      {#if notesStore.filtered.length === 0}
        <li class="empty">No notes yet</li>
      {/if}
    </ul>
  </aside>

  <main class="editor-pane">
    <div class="editor-toolbar">
      {#if notesStore.currentName}
        <span class="current-name">{notesStore.currentName}</span>
        <span class="save-status">{notesStore.saving ? "Saving…" : notesStore.dirty ? "Unsaved" : "Saved"}</span>
        <span class="spacer"></span>
        <button type="button" class:active={showPreview} onclick={() => (showPreview = !showPreview)}>Preview</button>
        <button type="button" class="danger" onclick={() => notesStore.deleteCurrent()}>Delete</button>
      {:else}
        <span class="hint-text">Select a note on the left, or create a new one.</span>
      {/if}
    </div>
    <div class="editor-body">
      <div class="cm-host" bind:this={editorContainer}></div>
      {#if showPreview && notesStore.currentName}
        <div class="preview">{@html previewHtml}</div>
      {/if}
    </div>
  </main>
</div>

<style>
  .notes-tile {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
  }

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    overflow-y: auto;
  }
  .sidebar-header {
    display: flex;
    gap: 0.4rem;
  }
  .sidebar-header input,
  .create-row input {
    flex: 1;
    min-width: 0;
    font: inherit;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
  }
  .sidebar-header input:focus,
  .create-row input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .create-row {
    display: flex;
    gap: 0.4rem;
  }

  button {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.3rem 0.5rem;
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
  button.danger {
    border-color: rgba(243, 139, 168, 0.4);
    color: var(--error);
  }

  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .tag-chips button {
    font-size: 0.7rem;
    padding: 0.15rem 0.45rem;
  }

  .note-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    overflow-y: auto;
  }
  .note-list li.empty {
    opacity: 0.5;
    font-size: 0.8rem;
    padding: 0.4rem;
  }
  .note-list button {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    border: none;
    padding: 0.4rem 0.5rem;
    text-align: left;
  }
  .note-list li.active button {
    background: rgba(255, 255, 255, 0.08);
  }
  .note-title {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .note-preview {
    font-size: 0.72rem;
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .editor-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0.7rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.78rem;
  }
  .current-name {
    font-weight: 600;
  }
  .save-status {
    opacity: 0.55;
  }
  .hint-text {
    opacity: 0.55;
  }
  .spacer {
    flex: 1;
  }

  .editor-body {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .cm-host {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .preview {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    line-height: 1.55;
  }
  .preview :global(code) {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.08);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }
  .preview :global(pre) {
    background: rgba(255, 255, 255, 0.06);
    padding: 0.6rem;
    border-radius: calc(var(--radius) - 2px);
    overflow-x: auto;
  }
  .preview :global(pre code) {
    background: none;
    padding: 0;
  }
  .preview :global(blockquote) {
    border-left: 3px solid var(--accent);
    margin: 0.5rem 0;
    padding-left: 0.75rem;
    opacity: 0.85;
  }
</style>
