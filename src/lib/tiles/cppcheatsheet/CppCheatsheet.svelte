<script lang="ts">
  import ReferenceBrowser from "../../components/ReferenceBrowser.svelte";
  import { cppEntries } from "./data";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();
</script>

<ReferenceBrowser entries={cppEntries.map((e) => ({ ...e, monospace: true }))} {focused} emptyHint="No matching entries" />
