<script lang="ts">
  import * as YAML from "yaml";
  import { vimState } from "../../vim/stateMachine.svelte";
  import { parseCsv, stringifyCsv, rowsToObjects, objectsToRows } from "../../util/csv";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Format = "json" | "yaml" | "csv";

  let inputFormat: Format = $state("json");
  let outputFormat: Format = $state("yaml");
  let minify = $state(false);
  let input = $state('{\n  "name": "Ada",\n  "skills": ["math", "logic"],\n  "active": true\n}');
  let inputEl: HTMLTextAreaElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  function parseAs(text: string, fmt: Format): unknown {
    if (fmt === "json") return JSON.parse(text);
    if (fmt === "yaml") return YAML.parse(text);
    return rowsToObjects(parseCsv(text));
  }

  function stringifyAs(value: unknown, fmt: Format): string {
    if (fmt === "json") return minify ? JSON.stringify(value) : JSON.stringify(value, null, 2);
    if (fmt === "yaml") return YAML.stringify(value);
    if (!Array.isArray(value) || !value.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
      throw new Error("CSV output requires an array of flat objects, e.g. [{...}, {...}]");
    }
    return stringifyCsv(objectsToRows(value as Record<string, unknown>[]));
  }

  const result = $derived.by((): { text: string; error: string | null } => {
    if (!input.trim()) return { text: "", error: null };
    try {
      const parsed = parseAs(input, inputFormat);
      return { text: stringifyAs(parsed, outputFormat), error: null };
    } catch (err) {
      return { text: "", error: err instanceof Error ? err.message : "Error" };
    }
  });

  function swap() {
    const newInput = result.error ? input : result.text;
    const tmp = inputFormat;
    inputFormat = outputFormat;
    outputFormat = tmp;
    if (!result.error) input = newInput;
  }

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="formatter-tile">
  <div class="toolbar">
    <select bind:value={inputFormat} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()}>
      <option value="json">JSON</option>
      <option value="yaml">YAML</option>
      <option value="csv">CSV</option>
    </select>
    <button type="button" onclick={swap} title="Swap input/output">⇄</button>
    <select bind:value={outputFormat} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()}>
      <option value="json">JSON</option>
      <option value="yaml">YAML</option>
      <option value="csv">CSV</option>
    </select>
    {#if outputFormat === "json"}
      <label class="minify"><input type="checkbox" bind:checked={minify} /> minify</label>
    {/if}
    <span class="status" class:error={!!result.error}>{result.error ? "Invalid input" : "Valid"}</span>
  </div>

  <div class="panes">
    <textarea
      bind:this={inputEl}
      bind:value={input}
      onkeydown={onKeydown}
      onfocus={() => vimState.enterInsert()}
      onblur={() => vimState.enterNormal()}
      spellcheck="false"
    ></textarea>
    <div class="output-pane">
      {#if result.error}
        <div class="error-text">{result.error}</div>
      {:else}
        <pre>{result.text}</pre>
      {/if}
    </div>
  </div>
</div>

<style>
  .formatter-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.7rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  select,
  button {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.25rem 0.5rem;
    cursor: pointer;
  }
  .minify {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    opacity: 0.8;
  }
  .status {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.6;
  }
  .status.error {
    color: var(--error);
    opacity: 1;
  }
  .panes {
    flex: 1;
    display: flex;
    gap: 0.6rem;
    min-height: 0;
  }
  textarea,
  .output-pane {
    flex: 1;
    min-width: 0;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem;
    overflow: auto;
  }
  textarea {
    resize: none;
    color: var(--fg);
    outline: none;
  }
  textarea:focus {
    border-color: var(--accent);
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .error-text {
    color: var(--error);
  }
</style>
