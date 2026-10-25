<script lang="ts">
  import katex from "katex";
  import "katex/dist/katex.min.css";

  let { tex, display = false }: { tex: string; display?: boolean } = $props();

  const html = $derived.by(() => {
    try {
      return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "html" });
    } catch (err) {
      return `<span class="katex-error">${err instanceof Error ? err.message : "render error"}</span>`;
    }
  });
</script>

<span class="katex-host">{@html html}</span>

<style>
  .katex-host {
    color: inherit;
  }
  :global(.katex-error) {
    color: var(--error);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.8em;
  }
</style>
