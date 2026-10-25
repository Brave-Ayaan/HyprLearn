<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let pattern = $state("(\\w+)@(\\w+\\.\\w+)");
  let flags = $state("g");
  let testString = $state("Contact us at hello@example.com or support@test.org for help.");
  let patternEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => patternEl?.focus());
  });

  const regexResult = $derived.by((): { re: RegExp | null; error: string | null } => {
    try {
      return { re: new RegExp(pattern, flags), error: null };
    } catch (err) {
      return { re: null, error: err instanceof Error ? err.message : "Invalid regex" };
    }
  });

  interface MatchInfo {
    index: number;
    text: string;
    groups: (string | undefined)[];
    named: Record<string, string> | undefined;
  }

  const matches = $derived.by((): MatchInfo[] => {
    const { re } = regexResult;
    if (!re) return [];
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const out: MatchInfo[] = [];
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = globalRe.exec(testString)) && guard++ < 10000) {
      out.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups });
      if (m[0] === "") globalRe.lastIndex++;
    }
    return out;
  });

  const highlighted = $derived.by(() => {
    if (matches.length === 0) return escapeHtml(testString);
    let out = "";
    let last = 0;
    for (const m of matches) {
      out += escapeHtml(testString.slice(last, m.index));
      out += `<mark>${escapeHtml(m.text)}</mark>`;
      last = m.index + m.text.length;
    }
    out += escapeHtml(testString.slice(last));
    return out;
  });

  function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function toggleFlag(f: string) {
    flags = flags.includes(f) ? flags.replace(f, "") : flags + f;
  }

  function onInputKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="regex-tile">
  <div class="pattern-row">
    <span class="slash">/</span>
    <input
      bind:this={patternEl}
      bind:value={pattern}
      onkeydown={onInputKeydown}
      class="pattern"
      spellcheck="false"
      autocomplete="off"
    />
    <span class="slash">/</span>
    <div class="flags">
      {#each ["g", "i", "m", "s", "u", "y"] as f (f)}
        <button type="button" class:active={flags.includes(f)} onclick={() => toggleFlag(f)}>{f}</button>
      {/each}
    </div>
  </div>
  {#if regexResult.error}<div class="error">{regexResult.error}</div>{/if}

  <textarea
    bind:value={testString}
    onkeydown={onInputKeydown}
    onfocus={() => vimState.enterInsert()}
    onblur={() => vimState.enterNormal()}
    spellcheck="false"
    placeholder="Test string..."
  ></textarea>

  <div class="highlighted">{@html highlighted}</div>

  <div class="matches">
    <div class="matches-head">{matches.length} match{matches.length === 1 ? "" : "es"}</div>
    <ul>
      {#each matches as m, i (i)}
        <li>
          <span class="idx">[{m.index}]</span>
          <span class="mono match-text">{m.text}</span>
          {#if m.groups.some((g) => g !== undefined)}
            <span class="groups">
              {#each m.groups as g, gi (gi)}
                <span class="group">g{gi + 1}: {g ?? "—"}</span>
              {/each}
            </span>
          {/if}
          {#if m.named}
            <span class="groups">
              {#each Object.entries(m.named) as [k, v] (k)}
                <span class="group">{k}: {v}</span>
              {/each}
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .regex-tile {
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
  .pattern-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .slash {
    opacity: 0.4;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .pattern {
    flex: 1;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
  }
  .pattern:focus {
    outline: none;
    border-color: var(--accent);
  }
  .flags {
    display: flex;
    gap: 0.2rem;
  }
  button {
    font: inherit;
    font-size: 0.72rem;
    padding: 0.2rem 0.45rem;
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
  .error {
    color: var(--error);
    font-size: 0.75rem;
  }
  textarea {
    height: 4rem;
    resize: vertical;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.4rem 0.5rem;
  }
  textarea:focus {
    outline: none;
    border-color: var(--accent);
  }
  .highlighted {
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 5rem;
    overflow-y: auto;
  }
  .highlighted :global(mark) {
    background: var(--accent);
    color: var(--background);
    border-radius: 2px;
  }
  .matches {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .matches-head {
    opacity: 0.6;
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  li {
    padding: 0.25rem 0.4rem;
    border-radius: calc(var(--radius) - 2px);
    background: rgba(255, 255, 255, 0.02);
    font-size: 0.78rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: baseline;
  }
  .idx {
    opacity: 0.45;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.7rem;
  }
  .match-text {
    color: var(--accent);
  }
  .groups {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .group {
    opacity: 0.6;
    font-size: 0.7rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
</style>
