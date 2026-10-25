<script lang="ts">
  import "@fontsource/jetbrains-mono/400.css";
  import "@fontsource/jetbrains-mono/500.css";
  import "@fontsource/jetbrains-mono/600.css";
  import "@fontsource/jetbrains-mono/700.css";
  import { onMount } from "svelte";
  import { tiling } from "./lib/tiling/store.svelte";
  import { configStore } from "./lib/config/store.svelte";
  import { vimState } from "./lib/vim/stateMachine.svelte";
  import { paletteState } from "./lib/actions/paletteState.svelte";
  import TileTree from "./lib/components/TileTree.svelte";
  import StatusBar from "./lib/components/StatusBar.svelte";
  import SystemBar from "./lib/components/SystemBar.svelte";
  import CommandPalette from "./lib/components/CommandPalette.svelte";
  import { tileRegistry, fallbackTileType } from "./lib/tiles/registry";

  let ready = $state(false);

  onMount(() => {
    function onKeydown(e: KeyboardEvent) {
      if (paletteState.open) return; // the palette owns its own keydown handling
      const consumed = vimState.handleKeydown(e);
      if (consumed) e.preventDefault();
    }
    window.addEventListener("keydown", onKeydown);

    (async () => {
      await configStore.init();
      if (configStore.config) vimState.configure(configStore.config);
      await tiling.init();
      ready = true;
    })();

    return () => window.removeEventListener("keydown", onKeydown);
  });

  const theme = $derived(configStore.config?.theme);
  const gaps = $derived(configStore.config?.layout.gaps ?? 6);

  const fullscreenLeaf = $derived.by(() => {
    const layout = tiling.layout;
    if (!layout?.fullscreen) return null;
    return findLeaf(layout.root, layout.fullscreen);
  });

  function findLeaf(node: import("./lib/tiling/types").TreeNode, id: number): { id: number; tile_type: string } | null {
    if (node.kind === "Leaf") return node.id === id ? node : null;
    for (const child of node.children) {
      const found = findLeaf(child, id);
      if (found) return found;
    }
    return null;
  }
</script>

<div
  class="app-shell"
  style="
    --accent: {theme?.accent ?? '#61afef'};
    --background: {theme?.background ?? '#282c34'};
    --fg: {theme?.foreground ?? '#abb2bf'};
    --tile-bg: {theme?.surface ?? '#2c313a'};
    --panel-bg: {theme?.overlay ?? '#323842'};
    --statusbar-bg: {theme?.overlay ?? '#323842'};
    --border-color: {theme?.border ?? '#3e4451'};
    --success: {theme?.success ?? '#98c379'};
    --warning: {theme?.warning ?? '#e5c07b'};
    --error: {theme?.error ?? '#e06c75'};
    --radius: {theme?.border_radius ?? 6}px;
  "
>
  {#if ready && tiling.layout}
    <SystemBar />
    <main>
      {#if fullscreenLeaf}
        {@const Comp = tileRegistry[fullscreenLeaf.tile_type] ?? tileRegistry[fallbackTileType]}
        <div class="leaf fullscreen">
          <Comp id={fullscreenLeaf.id} tileType={fullscreenLeaf.tile_type} focused={true} />
        </div>
      {:else}
        <TileTree node={tiling.layout.root} focused={tiling.layout.focused} {gaps} />
      {/if}
    </main>
    <StatusBar />
    <CommandPalette />
  {:else}
    <div class="loading">Loading...</div>
  {/if}
</div>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
    background: #1e1e2e;
  }
  :global(*) {
    box-sizing: border-box;
  }
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: var(--background);
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    overflow: hidden;
  }
  main {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .leaf.fullscreen {
    flex: 1;
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--tile-bg);
    margin: 4px;
  }
  .loading {
    margin: auto;
    opacity: 0.6;
  }
</style>
