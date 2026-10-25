<script lang="ts">
  import ReferenceBrowser from "../../components/ReferenceBrowser.svelte";
  import { constants } from "./data";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();
</script>

<ReferenceBrowser entries={constants} {focused} emptyHint="No matching constants" />
