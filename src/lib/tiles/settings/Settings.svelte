<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { open } from "@tauri-apps/plugin-dialog";
  import { configStore } from "../../config/store.svelte";
  import { vimState } from "../../vim/stateMachine.svelte";
  import { themePresets } from "../../theme/presets";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Tab = "appearance" | "layout" | "folders" | "keybindings";
  let tab: Tab = $state("appearance");

  let notesDir = $state("");
  let notesSaved = $state(false);
  let vaultDir = $state("");
  let vaultSaved = $state(false);

  let rawText = $state("");
  let rawError: string | null = $state(null);
  let rawSaved = $state(false);

  let structuredSaved = $state(false);
  let firstInput: HTMLInputElement | undefined = $state();

  configStore.init();
  invoke<string>("get_notes_dir").then((d) => (notesDir = d));
  invoke<string>("get_vault_dir").then((d) => (vaultDir = d));
  invoke<string>("get_raw_config").then((t) => (rawText = t));

  $effect(() => {
    if (focused) queueMicrotask(() => firstInput?.focus());
  });

  function flash(setter: (v: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 1200);
  }

  async function saveStructured() {
    if (!configStore.config) return;
    await configStore.save(configStore.config);
    vimState.configure(configStore.config);
    flash((v) => (structuredSaved = v));
  }

  function applyPreset(name: string) {
    const preset = themePresets.find((p) => p.name === name);
    if (!preset || !configStore.config) return;
    configStore.config.theme = { ...preset };
  }

  async function saveNotesDir() {
    await invoke("set_notes_dir", { directory: notesDir });
    flash((v) => (notesSaved = v));
  }

  async function saveVaultDir() {
    await invoke("set_vault_dir", { directory: vaultDir });
    flash((v) => (vaultSaved = v));
  }

  async function browseFolder(): Promise<string | null> {
    const picked = await open({ directory: true });
    return typeof picked === "string" ? picked : null;
  }

  async function browseNotesDir() {
    const picked = await browseFolder();
    if (picked) notesDir = picked;
  }

  async function browseVaultDir() {
    const picked = await browseFolder();
    if (picked) vaultDir = picked;
  }

  async function saveRaw() {
    try {
      await invoke("save_raw_config", { text: rawText });
      rawError = null;
      await configStore.init();
      if (configStore.config) vimState.configure(configStore.config);
      flash((v) => (rawSaved = v));
    } catch (err) {
      rawError = err instanceof Error ? err.message : String(err);
    }
  }

  async function reloadRaw() {
    rawText = await invoke<string>("get_raw_config");
    rawError = null;
  }
</script>

<div class="settings-tile">
  <div class="tabs">
    <button type="button" class:active={tab === "appearance"} onclick={() => (tab = "appearance")}>Appearance</button>
    <button type="button" class:active={tab === "layout"} onclick={() => (tab = "layout")}>Layout</button>
    <button type="button" class:active={tab === "folders"} onclick={() => (tab = "folders")}>Folders</button>
    <button type="button" class:active={tab === "keybindings"} onclick={() => (tab = "keybindings")}>Keybindings (raw)</button>
  </div>

  {#if !configStore.config}
    <div class="hint">Loading config...</div>
  {:else if tab === "appearance"}
    <div class="form">
      <label>
        Preset
        <select onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} onchange={(e) => applyPreset((e.target as HTMLSelectElement).value)}>
          <option value="">Pick a preset...</option>
          {#each themePresets as p (p.name)}
            <option value={p.name}>{p.name}</option>
          {/each}
        </select>
        <span class="dim">currently: {configStore.config.theme.name}</span>
      </label>
      <label>Accent <input bind:this={firstInput} type="color" bind:value={configStore.config.theme.accent} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Background <input type="color" bind:value={configStore.config.theme.background} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Foreground <input type="color" bind:value={configStore.config.theme.foreground} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Surface (tile bg) <input type="color" bind:value={configStore.config.theme.surface} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Overlay (panels) <input type="color" bind:value={configStore.config.theme.overlay} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Border <input type="color" bind:value={configStore.config.theme.border} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Success <input type="color" bind:value={configStore.config.theme.success} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Warning <input type="color" bind:value={configStore.config.theme.warning} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Error <input type="color" bind:value={configStore.config.theme.error} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Border radius (px) <input type="number" bind:value={configStore.config.theme.border_radius} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <button type="button" onclick={saveStructured}>Save{structuredSaved ? " ✓" : ""}</button>
    </div>
  {:else if tab === "layout"}
    <div class="form">
      <label>
        Default layout mode
        <select bind:value={configStore.config.layout.default_mode} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()}>
          <option value="bsp">bsp</option>
          <option value="master_stack">master_stack</option>
          <option value="grid">grid</option>
        </select>
      </label>
      <label>Gaps (px) <input type="number" bind:value={configStore.config.layout.gaps} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Border width (px) <input type="number" bind:value={configStore.config.layout.border_width} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <label>Leader key token <input bind:value={configStore.config.layout.leader_key} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} /></label>
      <button type="button" onclick={saveStructured}>Save{structuredSaved ? " ✓" : ""}</button>
      <p class="dim">Leader key token uses the same format as default_config.toml, e.g. "ctrl+ " for Ctrl+Space.</p>
    </div>
  {:else if tab === "folders"}
    <div class="form">
      <label class="wide">
        Notes directory (absolute path, blank = app data default)
        <div class="path-row">
          <input
            bind:value={notesDir}
            placeholder="Leave blank for the default location"
            onfocus={() => vimState.enterInsert()}
            onblur={() => vimState.enterNormal()}
          />
          <button type="button" onclick={browseNotesDir}>Browse...</button>
        </div>
      </label>
      <button type="button" onclick={saveNotesDir}>Save{notesSaved ? " ✓" : ""}</button>
      <p class="dim">Takes effect the next time the Notes tile lists or opens files.</p>

      <label class="wide">
        Vault directory (absolute path, blank = project's own vault/ folder)
        <div class="path-row">
          <input
            bind:value={vaultDir}
            placeholder="Leave blank for the default location"
            onfocus={() => vimState.enterInsert()}
            onblur={() => vimState.enterNormal()}
          />
          <button type="button" onclick={browseVaultDir}>Browse...</button>
        </div>
      </label>
      <button type="button" onclick={saveVaultDir}>Save{vaultSaved ? " ✓" : ""}</button>
      <p class="dim">Takes effect the next time the Vault tile lists or opens files.</p>
    </div>
  {:else}
    <div class="raw-editor">
      <textarea
        bind:value={rawText}
        spellcheck="false"
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
      ></textarea>
      {#if rawError}<div class="error">{rawError}</div>{/if}
      <div class="raw-actions">
        <button type="button" onclick={saveRaw}>Save{rawSaved ? " ✓" : ""}</button>
        <button type="button" onclick={reloadRaw}>Reload from disk</button>
      </div>
      <p class="dim">
        Validated against the full config schema before writing — a typo here is rejected with an error instead of
        corrupting config.toml. Keybinding changes apply immediately, no restart needed.
      </p>
    </div>
  {/if}
</div>

<style>
  .settings-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.75rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
    overflow-y: auto;
  }
  .tabs {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  button {
    font: inherit;
    font-size: 0.75rem;
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
  .hint {
    opacity: 0.55;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    max-width: 24rem;
  }
  label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.8rem;
  }
  label.wide {
    flex-direction: column;
    align-items: stretch;
  }
  .path-row {
    display: flex;
    gap: 0.4rem;
  }
  .path-row input {
    flex: 1;
    min-width: 0;
  }
  input,
  select {
    font: inherit;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.25rem 0.5rem;
  }
  input[type="color"] {
    width: 3rem;
    padding: 0.1rem;
  }
  .dim {
    opacity: 0.5;
    font-size: 0.72rem;
  }
  .raw-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-height: 0;
  }
  .raw-editor textarea {
    flex: 1;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.5rem 0.6rem;
    resize: none;
  }
  .raw-actions {
    display: flex;
    gap: 0.4rem;
  }
  .error {
    color: var(--error);
    font-size: 0.78rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    white-space: pre-wrap;
  }
</style>
