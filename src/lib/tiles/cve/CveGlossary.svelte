<script lang="ts">
  import ReferenceBrowser from "../../components/ReferenceBrowser.svelte";
  import { cveGlossary } from "./data";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();
</script>

<ReferenceBrowser entries={cveGlossary} {focused} emptyHint="No matching entries" />
