<script lang="ts">
  import { onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { tiling } from "../tiling/store.svelte";
  import { flattenLeaves } from "../tiling/flatten";
  import { tileCatalog } from "../tiles/catalog";

  interface SystemBarInfo {
    cpu_percent: number;
    mem_used_mb: number;
    mem_total_mb: number;
  }

  let info: SystemBarInfo | null = $state(null);
  let pollId: ReturnType<typeof setInterval> | null = null;

  async function poll() {
    try {
      info = await invoke<SystemBarInfo>("get_system_bar_info");
    } catch {
      // backend not ready yet on first paint; next poll will catch it
    }
  }

  poll();
  pollId = setInterval(poll, 2000);
  onDestroy(() => {
    if (pollId) clearInterval(pollId);
  });

  function gb(mb: number): string {
    return (mb / 1024).toFixed(1);
  }

  const cpuLevel = $derived.by(() => {
    const p = info?.cpu_percent ?? 0;
    return p > 80 ? "high" : p > 50 ? "mid" : "low";
  });
  const memLevel = $derived.by(() => {
    if (!info || info.mem_total_mb === 0) return "low";
    const p = (info.mem_used_mb / info.mem_total_mb) * 100;
    return p > 85 ? "high" : p > 60 ? "mid" : "low";
  });

  const labelByType = new Map(tileCatalog.map((t) => [t.type, t.label]));

  // Open tiles *within this app* (not OS windows) - same DFS order jump_to_tile uses.
  const openTiles = $derived.by(() => {
    if (!tiling.layout) return [];
    return flattenLeaves(tiling.layout.root).map((leaf, i) => ({
      ...leaf,
      position: i + 1,
      label: labelByType.get(leaf.tile_type) ?? leaf.tile_type,
      focused: leaf.id === tiling.layout?.focused,
    }));
  });

  function focusTile(position: number) {
    void tiling.jumpTo(position);
  }
</script>

<div class="system-bar">
  <div class="stat cpu {cpuLevel}">
    <span class="label">CPU</span>
    <span class="value">{info ? info.cpu_percent.toFixed(0) : "--"}%</span>
  </div>
  <div class="stat mem {memLevel}">
    <span class="label">RAM</span>
    <span class="value">{info ? `${gb(info.mem_used_mb)} / ${gb(info.mem_total_mb)} GB` : "--"}</span>
  </div>
  <div class="divider"></div>
  <div class="tiles">
    {#each openTiles as t (t.id)}
      <button type="button" class="win" class:focused={t.focused} onclick={() => focusTile(t.position)}>
        <span class="num">{t.position}</span>{t.label}
      </button>
    {/each}
    {#if openTiles.length === 0}
      <span class="win dim">no tiles open</span>
    {/if}
  </div>
</div>

<style>
  .system-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0.75rem;
    background: var(--statusbar-bg);
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    color: var(--fg);
    overflow: hidden;
    flex-shrink: 0;
  }
  .stat {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }
  .stat .label {
    opacity: 0.55;
    font-size: 0.65rem;
    letter-spacing: 0.04em;
  }
  .stat.low .value {
    color: var(--success);
  }
  .stat.mid .value {
    color: var(--warning);
  }
  .stat.high .value {
    color: var(--error);
  }
  .divider {
    width: 1px;
    height: 1rem;
    background: var(--border-color, rgba(255, 255, 255, 0.1));
    flex-shrink: 0;
  }
  .tiles {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .win {
    font: inherit;
    font-size: 0.72rem;
    padding: 0.1rem 0.55rem;
    border-radius: 999px;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.04);
    color: var(--fg);
    opacity: 0.8;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .win:hover {
    opacity: 1;
  }
  .win.focused {
    border-color: var(--accent);
    color: var(--accent);
    opacity: 1;
  }
  .win.dim {
    opacity: 0.4;
    cursor: default;
  }
  .num {
    opacity: 0.5;
    font-size: 0.65rem;
  }
</style>
