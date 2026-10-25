<script lang="ts">
  import { onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import type { EditorView } from "@codemirror/view";
  import { createVaultEditor, replaceVaultDoc } from "./editor";
  import { flattenVaultTree, parentDirOf, type VaultNode } from "./types";
  import { focusedVaultSave, focusedVaultCloseGuard } from "./focus";
  import { tiling } from "../../tiling/store.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let tree: VaultNode[] = $state([]);
  let expanded: Set<string> = $state(new Set());
  let selectedPath: string | null = $state(null);

  let openPath: string | null = $state(null);
  let savedText = $state("");
  let docText = $state("");
  let loadError: string | null = $state(null);
  let saving = $state(false);
  let saveFlash = $state(false);

  let pending: { kind: "new-file" | "new-folder" | "rename"; dir: string; initial: string } | null = $state(null);
  let pendingName = $state("");
  let confirmDeletePath: string | null = $state(null);
  let pendingSwitchTo: string | null = $state(null);
  let pendingClose = $state(false);
  let pendingDraftRecovery: { relpath: string; content: string; savedUnix: number } | null = $state(null);

  let draftTimer: ReturnType<typeof setTimeout> | null = null;
  const DRAFT_DELAY_MS = 1200;

  let editorContainer: HTMLDivElement | undefined = $state();
  let view: EditorView | undefined;
  let nameInputEl: HTMLInputElement | undefined = $state();

  const dirty = $derived(openPath !== null && docText !== savedText);
  const flatRows = $derived(flattenVaultTree(tree, 0, expanded));

  async function refreshTree() {
    try {
      tree = await invoke<VaultNode[]>("list_vault_tree");
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  refreshTree();

  function guardClose(): boolean {
    if (!dirty) return true;
    pendingClose = true;
    return false;
  }
  function closeWithoutSaving() {
    pendingClose = false;
    tiling.close();
  }
  async function saveAndClose() {
    await save();
    pendingClose = false;
    tiling.close();
  }

  $effect(() => {
    if (focused) {
      focusedVaultSave.current = save;
      focusedVaultCloseGuard.current = guardClose;
    }
    return () => {
      if (focusedVaultSave.current === save) focusedVaultSave.current = null;
      if (focusedVaultCloseGuard.current === guardClose) focusedVaultCloseGuard.current = null;
    };
  });

  $effect(() => {
    if (focused && pending === null) queueMicrotask(() => view?.focus());
  });

  // Periodically snapshots the unsaved buffer to a draft file, separate
  // from the real file this Vault only ever writes on an explicit save -
  // so a crash or force-quit mid-edit isn't a total loss.
  $effect(() => {
    void docText;
    if (draftTimer) clearTimeout(draftTimer);
    if (!openPath || !dirty) return;
    const relpath = openPath;
    const content = docText;
    draftTimer = setTimeout(() => {
      void invoke("write_vault_draft", { relpath, content });
    }, DRAFT_DELAY_MS);
  });

  function formatRelativeTime(savedUnix: number): string {
    const seconds = Math.max(0, Math.round(Date.now() / 1000 - savedUnix));
    if (seconds < 60) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  function restoreDraft() {
    if (!pendingDraftRecovery || pendingDraftRecovery.relpath !== openPath) {
      pendingDraftRecovery = null;
      return;
    }
    docText = pendingDraftRecovery.content;
    if (view) replaceVaultDoc(view, docText);
    pendingDraftRecovery = null;
  }

  function discardDraft() {
    if (pendingDraftRecovery) void invoke("delete_vault_draft", { relpath: pendingDraftRecovery.relpath });
    pendingDraftRecovery = null;
  }

  function mountEditor(content: string, filename: string) {
    view?.destroy();
    view = undefined;
    if (!editorContainer) return;
    view = createVaultEditor({
      doc: content,
      filename,
      parent: editorContainer,
      onChange: (doc) => (docText = doc),
    });
  }

  async function openFile(relpath: string, force = false) {
    if (!force && dirty) {
      pendingSwitchTo = relpath;
      return;
    }
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = null;
    }
    pendingDraftRecovery = null;
    selectedPath = relpath;
    loadError = null;
    try {
      const content = await invoke<string>("read_vault_file", { relpath });
      openPath = relpath;
      savedText = content;
      docText = content;
      mountEditor(content, relpath);

      const draft = await invoke<{ content: string; saved_unix: number } | null>("read_vault_draft", { relpath });
      if (draft && draft.content !== content) {
        pendingDraftRecovery = { relpath, content: draft.content, savedUnix: draft.saved_unix };
      } else if (draft) {
        void invoke("delete_vault_draft", { relpath });
      }
    } catch (err) {
      openPath = null;
      view?.destroy();
      view = undefined;
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  function discardAndSwitch() {
    const target = pendingSwitchTo;
    pendingSwitchTo = null;
    if (target) void openFile(target, true);
  }

  async function save() {
    if (!openPath || saving) return;
    saving = true;
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = null;
    }
    try {
      await invoke("write_vault_file", { relpath: openPath, content: docText });
      savedText = docText;
      void invoke("delete_vault_draft", { relpath: openPath });
      saveFlash = true;
      setTimeout(() => (saveFlash = false), 900);
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    } finally {
      saving = false;
    }
  }

  function toggleDir(relpath: string) {
    const next = new Set(expanded);
    if (next.has(relpath)) next.delete(relpath);
    else next.add(relpath);
    expanded = next;
  }

  function onRowClick(node: VaultNode) {
    selectedPath = node.relpath;
    if (node.is_dir) toggleDir(node.relpath);
    else void openFile(node.relpath);
  }

  function contextDir(): string {
    if (!selectedPath) return "";
    const node = findNode(tree, selectedPath);
    if (node?.is_dir) return node.relpath;
    return parentDirOf(selectedPath);
  }

  function findNode(nodes: VaultNode[], relpath: string): VaultNode | null {
    for (const n of nodes) {
      if (n.relpath === relpath) return n;
      if (n.is_dir) {
        const found = findNode(n.children, relpath);
        if (found) return found;
      }
    }
    return null;
  }

  function startNewFile() {
    pending = { kind: "new-file", dir: contextDir(), initial: "" };
    pendingName = "";
    queueMicrotask(() => nameInputEl?.focus());
  }
  function startNewFolder() {
    pending = { kind: "new-folder", dir: contextDir(), initial: "" };
    pendingName = "";
    queueMicrotask(() => nameInputEl?.focus());
  }
  function startRename() {
    if (!selectedPath) return;
    const node = findNode(tree, selectedPath);
    if (!node) return;
    pending = { kind: "rename", dir: parentDirOf(selectedPath), initial: node.name };
    pendingName = node.name;
    queueMicrotask(() => nameInputEl?.focus());
  }

  async function confirmPending() {
    if (!pending) return;
    const name = pendingName.trim();
    if (!name) {
      pending = null;
      return;
    }
    const relpath = pending.dir ? `${pending.dir}/${name}` : name;
    try {
      if (pending.kind === "new-file") {
        await invoke("create_vault_entry", { relpath, isDir: false });
        expanded = new Set([...expanded, pending.dir].filter(Boolean));
        await refreshTree();
        void openFile(relpath, true);
      } else if (pending.kind === "new-folder") {
        await invoke("create_vault_entry", { relpath, isDir: true });
        expanded = new Set([...expanded, pending.dir, relpath].filter(Boolean));
        await refreshTree();
      } else if (pending.kind === "rename" && selectedPath) {
        await invoke("rename_vault_entry", { oldRelpath: selectedPath, newRelpath: relpath });
        void invoke("delete_vault_draft", { relpath: selectedPath });
        if (openPath === selectedPath) openPath = relpath;
        selectedPath = relpath;
        await refreshTree();
      }
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
    pending = null;
  }

  function cancelPending() {
    pending = null;
  }

  function askDelete() {
    if (selectedPath) confirmDeletePath = selectedPath;
  }
  async function doDelete() {
    if (!confirmDeletePath) return;
    const target = confirmDeletePath;
    confirmDeletePath = null;
    try {
      await invoke("delete_vault_entry", { relpath: target });
      if (openPath === target || openPath?.startsWith(`${target}/`)) {
        if (draftTimer) {
          clearTimeout(draftTimer);
          draftTimer = null;
        }
        pendingDraftRecovery = null;
        openPath = null;
        view?.destroy();
        view = undefined;
        docText = "";
        savedText = "";
      }
      if (selectedPath === target) selectedPath = null;
      await refreshTree();
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  function onNameKeydown(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === "Enter") confirmPending();
    else if (e.key === "Escape") cancelPending();
  }

  onDestroy(() => {
    view?.destroy();
    if (draftTimer) clearTimeout(draftTimer);
    if (focusedVaultSave.current === save) focusedVaultSave.current = null;
    if (focusedVaultCloseGuard.current === guardClose) focusedVaultCloseGuard.current = null;
  });
</script>

<div class="vault-tile">
  <div class="sidebar">
    <div class="toolbar">
      <button type="button" title="New file" onclick={startNewFile}>+file</button>
      <button type="button" title="New folder" onclick={startNewFolder}>+folder</button>
      <button type="button" title="Rename selected" disabled={!selectedPath} onclick={startRename}>rename</button>
      <button type="button" title="Delete selected" disabled={!selectedPath} onclick={askDelete}>del</button>
    </div>
    <div class="tree">
      {#each flatRows as row (row.node.relpath)}
        <div
          class="row"
          class:selected={row.node.relpath === selectedPath}
          class:dir={row.node.is_dir}
          style="padding-left: {0.5 + row.depth * 0.9}rem"
          role="treeitem"
          aria-selected={row.node.relpath === selectedPath}
          tabindex="0"
          onclick={() => onRowClick(row.node)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onRowClick(row.node);
            }
          }}
        >
          <span class="icon">{row.node.is_dir ? (expanded.has(row.node.relpath) ? "▾" : "▸") : "·"}</span>
          <span class="name">{row.node.name}</span>
        </div>
      {/each}
      {#if pending}
        <div class="row pending-row" style="padding-left: {0.5 + (pending.dir ? 1 : 0) * 0.9}rem">
          <span class="icon">{pending.kind === "new-folder" ? "▸" : "·"}</span>
          <input
            bind:this={nameInputEl}
            bind:value={pendingName}
            placeholder={pending.kind === "rename" ? "new name" : pending.kind === "new-folder" ? "folder name" : "file name (e.g. notes.md)"}
            onkeydown={onNameKeydown}
            onblur={confirmPending}
          />
        </div>
      {/if}
      {#if flatRows.length === 0 && !pending}
        <div class="empty">Empty vault. Click +file to create one.</div>
      {/if}
    </div>
    {#if confirmDeletePath}
      <div class="confirm-bar">
        <span>Delete "{confirmDeletePath}"?</span>
        <button type="button" class="danger" onclick={doDelete}>Yes</button>
        <button type="button" onclick={() => (confirmDeletePath = null)}>No</button>
      </div>
    {/if}
  </div>

  <div class="editor-pane">
    <div class="editor-toolbar">
      <span class="filename">{openPath ?? "No file open"}</span>
      {#if dirty}<span class="dirty-dot" title="Unsaved changes">●</span>{/if}
      <button type="button" class="save" disabled={!openPath || !dirty || saving} onclick={save}>
        {saveFlash ? "Saved" : saving ? "Saving..." : "Save (:save)"}
      </button>
    </div>
    {#if pendingSwitchTo}
      <div class="confirm-bar">
        <span>Discard unsaved changes to "{openPath}"?</span>
        <button type="button" class="danger" onclick={discardAndSwitch}>Discard</button>
        <button type="button" onclick={() => (pendingSwitchTo = null)}>Cancel</button>
      </div>
    {/if}
    {#if pendingClose}
      <div class="confirm-bar">
        <span>Close tile with unsaved changes to "{openPath}"?</span>
        <button type="button" class="danger" onclick={closeWithoutSaving}>Close without saving</button>
        <button type="button" onclick={saveAndClose}>Save and close</button>
        <button type="button" onclick={() => (pendingClose = false)}>Cancel</button>
      </div>
    {/if}
    {#if pendingDraftRecovery}
      <div class="confirm-bar recovery">
        <span>Unsaved draft from {formatRelativeTime(pendingDraftRecovery.savedUnix)} found (likely from a crash or force-quit) - restore it?</span>
        <button type="button" onclick={restoreDraft}>Restore draft</button>
        <button type="button" onclick={discardDraft}>Discard</button>
      </div>
    {/if}
    {#if loadError}
      <div class="error-banner">{loadError}</div>
    {/if}
    <div class="cm-host" bind:this={editorContainer} class:hidden={!openPath}></div>
    {#if !openPath && !loadError}
      <div class="placeholder">Select a file on the left, or create one with +file.</div>
    {/if}
  </div>
</div>

<style>
  .vault-tile {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.78rem;
  }
  .sidebar {
    width: 13rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    min-height: 0;
  }
  .toolbar {
    display: flex;
    gap: 0.25rem;
    padding: 0.4rem;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  }
  button {
    font: inherit;
    font-size: 0.68rem;
    padding: 0.2rem 0.4rem;
    border-radius: calc(var(--radius) - 3px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  button.danger {
    border-color: var(--error);
    color: var(--error);
  }
  .tree {
    flex: 1;
    overflow-y: auto;
    padding: 0.25rem 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.18rem 0.4rem;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
  }
  .row:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .row.selected {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .icon {
    opacity: 0.55;
    width: 0.9em;
    text-align: center;
    flex-shrink: 0;
  }
  .row.dir .name {
    opacity: 0.9;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pending-row input {
    font: inherit;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--accent);
    border-radius: 3px;
    color: var(--fg);
    padding: 0.1rem 0.3rem;
    width: 100%;
  }
  .empty {
    opacity: 0.4;
    padding: 0.6rem;
    font-size: 0.72rem;
  }
  .confirm-bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem;
    background: color-mix(in srgb, var(--error) 15%, transparent);
    font-size: 0.72rem;
    flex-wrap: wrap;
  }
  .confirm-bar.recovery {
    background: color-mix(in srgb, var(--warning) 15%, transparent);
  }
  .editor-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  }
  .filename {
    opacity: 0.75;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dirty-dot {
    color: var(--warning);
  }
  .save {
    margin-left: auto;
  }
  .error-banner {
    padding: 0.4rem 0.6rem;
    background: color-mix(in srgb, var(--error) 15%, transparent);
    color: var(--error);
    font-size: 0.72rem;
  }
  .cm-host {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .cm-host.hidden {
    display: none;
  }
  .placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.4;
    text-align: center;
    padding: 1rem;
  }
</style>
