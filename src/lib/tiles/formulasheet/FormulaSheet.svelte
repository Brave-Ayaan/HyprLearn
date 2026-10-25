<script lang="ts">
  import ReferenceBrowser from "../../components/ReferenceBrowser.svelte";
  import { formulas } from "./data";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();
</script>

<ReferenceBrowser entries={formulas} {focused} emptyHint="No matching formulas" />
