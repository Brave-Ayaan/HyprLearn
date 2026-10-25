<script lang="ts">
  import { vimState } from "../vim/stateMachine.svelte";
  import { tiling } from "../tiling/store.svelte";

  const modeLabel = $derived(vimState.mode.toUpperCase());
</script>

<div class="status-bar">
  <span class="mode mode-{vimState.mode.toLowerCase()}">{modeLabel}</span>

  {#if vimState.mode === "Command"}
    <span class="command-line">:{vimState.commandBuffer}</span>
  {:else if vimState.pendingKeys}
    <span class="pending">{vimState.pendingKeys}</span>
  {/if}

  <span class="spacer"></span>
  <span class="layout-mode">{tiling.layout?.mode ?? ""}</span>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.25rem 0.75rem;
    background: var(--statusbar-bg);
    color: var(--fg);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.8rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .mode {
    font-weight: 700;
    padding: 0.1rem 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
  }
  .mode-normal {
    color: var(--accent);
  }
  .mode-insert {
    color: var(--success);
  }
  .mode-leader {
    color: #f9e2af;
  }
  .mode-command {
    color: #fab387;
  }
  .command-line,
  .pending {
    opacity: 0.85;
  }
  .spacer {
    flex: 1;
  }
  .layout-mode {
    opacity: 0.6;
    text-transform: capitalize;
  }
</style>
