<script lang="ts">
  import { onDestroy } from "svelte";
  import type { EditorView } from "@codemirror/view";
  import { vimState } from "../../vim/stateMachine.svelte";
  import { scratchpadStore } from "./store.svelte";
  import { createSnippetEditor, replaceDoc, type SnippetLanguage } from "./editor";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let editorContainer: HTMLDivElement | undefined = $state();
  let view: EditorView | undefined;
  let viewLanguage: SnippetLanguage | null = null;

  let creatingNew = $state(false);
  let newTitle = $state("");
  let newLanguage: SnippetLanguage = $state("plain");
  let newTitleInput: HTMLInputElement | undefined = $state();

  scratchpadStore.refresh();

  onDestroy(() => {
    view?.destroy();
  });

  async function ensureEditor() {
    if (!editorContainer) return;
    const lang = scratchpadStore.current?.language ?? "plain";
    if (view && viewLanguage === lang) return;
    view?.destroy();
    view = undefined;
    viewLanguage = lang;
    view = await createSnippetEditor({
      doc: scratchpadStore.content,
      language: lang,
      parent: editorContainer,
      onChange: (doc) => scratchpadStore.setContent(doc),
    });
    if (focused) view.focus();
  }

  $effect(() => {
    void scratchpadStore.current?.language;
    void editorContainer;
    void ensureEditor();
  });

  $effect(() => {
    const content = scratchpadStore.content;
    if (view) replaceDoc(view, content);
  });

  $effect(() => {
    if (focused && view) queueMicrotask(() => view?.focus());
  });

  function startCreate() {
    creatingNew = true;
    newTitle = "";
    newLanguage = "plain";
    queueMicrotask(() => newTitleInput?.focus());
  }
  async function confirmCreate() {
    const title = newTitle.trim() || "Untitled";
    creatingNew = false;
    await scratchpadStore.createAndOpen(title, newLanguage);
  }
  function onNewTitleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      creatingNew = false;
    }
  }
</script>

<div class="scratch-tile">
  <aside class="sidebar">
    <button type="button" onclick={startCreate}>+ New snippet</button>
    {#if creatingNew}
      <div class="create-row">
        <input
          bind:this={newTitleInput}
          bind:value={newTitle}
          placeholder="Title..."
          onfocus={() => vimState.enterInsert()}
          onblur={() => vimState.enterNormal()}
          onkeydown={onNewTitleKeydown}
          spellcheck="false"
        />
        <select bind:value={newLanguage} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()}>
          <option value="plain">plain text</option>
          <option value="javascript">javascript</option>
          <option value="python">python</option>
          <option value="json">json</option>
          <option value="rust">rust</option>
        </select>
        <button type="button" onclick={confirmCreate}>Create</button>
      </div>
    {/if}
    <ul class="snippet-list">
      {#each scratchpadStore.snippets as s (s.id)}
        <li class:active={s.id === scratchpadStore.currentId}>
          <button type="button" onclick={() => scratchpadStore.open(s.id)}>
            <span class="snip-title">{s.title}</span>
            <span class="snip-lang">{s.language}</span>
          </button>
        </li>
      {/each}
      {#if scratchpadStore.snippets.length === 0}
        <li class="empty">No snippets yet</li>
      {/if}
    </ul>
  </aside>

  <main class="editor-pane">
    <div class="editor-toolbar">
      {#if scratchpadStore.current}
        <span class="current-name">{scratchpadStore.current.title}</span>
        <span class="save-status">{scratchpadStore.saving ? "Saving…" : scratchpadStore.dirty ? "Unsaved" : "Saved"}</span>
        <span class="spacer"></span>
        <button type="button" class="danger" onclick={() => scratchpadStore.remove()}>Delete</button>
      {:else}
        <span class="hint-text">Select a snippet on the left, or create a new one.</span>
      {/if}
    </div>
    <div class="cm-host" bind:this={editorContainer}></div>
  </main>
</div>

<style>
  .scratch-tile {
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
  .create-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .create-row input,
  .create-row select {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.25rem 0.4rem;
  }
  .snippet-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .snippet-list li.empty {
    opacity: 0.5;
    font-size: 0.8rem;
    padding: 0.4rem;
  }
  .snippet-list button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    border: none;
    text-align: left;
    padding: 0.35rem 0.5rem;
  }
  .snippet-list li.active button {
    background: rgba(255, 255, 255, 0.08);
  }
  .snip-title {
    font-size: 0.85rem;
  }
  .snip-lang {
    opacity: 0.5;
    font-size: 0.7rem;
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
  .danger {
    border-color: rgba(243, 139, 168, 0.4);
    color: var(--error);
  }
  .cm-host {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
