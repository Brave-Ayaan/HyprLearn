<script lang="ts">
  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();
</script>

<div class="dummy-tile" class:focused>
  <div class="label">#{id} &middot; {tileType}</div>
  <p>Empty tile. Extend <code>src/lib/tiles/registry.ts</code> to register a real component for this tile type.</p>
</div>

<style>
  .dummy-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    box-sizing: border-box;
    color: var(--fg);
    overflow: auto;
  }
  .label {
    font-weight: 600;
    opacity: 0.8;
  }
  .focused .label {
    opacity: 1;
    color: var(--accent);
  }
</style>
