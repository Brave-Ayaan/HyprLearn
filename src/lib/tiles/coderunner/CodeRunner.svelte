<script lang="ts">
  import { onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import type { EditorView } from "@codemirror/view";
  import { createCodeEditor, replaceDoc } from "./editor";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Language = "c" | "cpp";
  let language: Language = $state("cpp");

  const STARTER: Record<Language, string> = {
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}\n',
    c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello from C!\\n");\n    return 0;\n}\n',
  };

  let code = $state(STARTER.cpp);
  let editorContainer: HTMLDivElement | undefined = $state();
  let view: EditorView | undefined;

  interface RunResult {
    stdout: string;
    stderr: string;
    exit_code: number | null;
    timed_out: boolean;
    compile_error: string | null;
  }
  let result: RunResult | null = $state(null);
  let running = $state(false);
  let error: string | null = $state(null);

  $effect(() => {
    if (editorContainer && !view) {
      view = createCodeEditor({
        doc: code,
        parent: editorContainer,
        onChange: (doc) => (code = doc),
      });
    }
  });

  onDestroy(() => {
    view?.destroy();
  });

  $effect(() => {
    if (focused && view) queueMicrotask(() => view?.focus());
  });

  function switchLanguage(lang: Language) {
    language = lang;
    // Only reseed the starter template if the buffer still matches the
    // *other* language's starter verbatim - never clobber real edits.
    if (code === STARTER.c || code === STARTER.cpp) {
      code = STARTER[lang];
      if (view) replaceDoc(view, code);
    }
  }

  async function run() {
    running = true;
    error = null;
    result = null;
    try {
      result = await invoke<RunResult>("run_c_cpp", { code, language });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      running = false;
    }
  }
</script>

<div class="runner-tile">
  <div class="toolbar">
    <button type="button" class:active={language === "cpp"} onclick={() => switchLanguage("cpp")}>C++</button>
    <button type="button" class:active={language === "c"} onclick={() => switchLanguage("c")}>C</button>
    <button type="button" class="run" onclick={run} disabled={running}>{running ? "Running..." : "Run (g++/gcc)"}</button>
  </div>

  <div class="editor-body">
    <div class="cm-host" bind:this={editorContainer}></div>
    <div class="output-pane">
      {#if error}
        <div class="section error">{error}</div>
      {:else if result?.compile_error}
        <div class="section-label">Compile error</div>
        <pre class="error">{result.compile_error}</pre>
      {:else if result}
        {#if result.stdout}
          <div class="section-label">stdout</div>
          <pre>{result.stdout}</pre>
        {/if}
        {#if result.stderr}
          <div class="section-label">stderr</div>
          <pre class="error">{result.stderr}</pre>
        {/if}
        <div class="meta">
          {#if result.timed_out}
            <span class="error">timed out</span>
          {:else}
            exit code: {result.exit_code ?? "?"}
          {/if}
        </div>
      {:else}
        <div class="placeholder">Output will appear here after you run.</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .runner-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
  }
  .toolbar {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  }
  button {
    font: inherit;
    font-size: 0.78rem;
    padding: 0.3rem 0.6rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  button.active {
    background: var(--accent);
    color: var(--background);
    border-color: var(--accent);
  }
  button.run {
    margin-left: auto;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .editor-body {
    flex: 1;
    display: flex;
    min-height: 0;
  }
  .cm-host {
    flex: 1.4;
    min-width: 0;
    overflow: hidden;
  }
  .output-pane {
    flex: 1;
    min-width: 0;
    border-left: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    padding: 0.6rem;
    overflow-y: auto;
  }
  .section-label {
    font-size: 0.7rem;
    opacity: 0.5;
    margin: 0.4rem 0 0.2rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.8rem;
  }
  .error {
    color: var(--error);
  }
  .meta {
    margin-top: 0.5rem;
    opacity: 0.6;
    font-size: 0.75rem;
  }
  .placeholder {
    opacity: 0.4;
  }
</style>
