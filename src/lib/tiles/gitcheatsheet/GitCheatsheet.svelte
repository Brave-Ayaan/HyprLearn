<script lang="ts">
  import ReferenceBrowser from "../../components/ReferenceBrowser.svelte";
  import { gitCommands } from "./data";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();
</script>

<ReferenceBrowser entries={gitCommands} {focused} emptyHint="No matching git commands" />
