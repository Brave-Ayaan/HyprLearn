<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { evaluate, formatNumber, type AngleMode } from "./engine";
  import {
    applyBitwise,
    formatInBase,
    isValidDigit,
    maskToWidth,
    parseInBase,
    toSigned,
    type Base,
    type BitWidth,
    type BitwiseOp,
  } from "../../util/bitwise";
  import type { HistoryEntry } from "./types";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let calcMode: "scientific" | "programmer" = $state("scientific");
  let angleMode: AngleMode = $state("rad");
  let expression = $state("");
  let history: HistoryEntry[] = $state([]);
  let selectedHistory: number | null = $state(null);

  let base: Base = $state(10);
  let bitWidth: BitWidth = $state(32);
  let progText = $state("0");
  let operandBText = $state("0");

  let inputEl: HTMLInputElement | undefined = $state();
  let progInputEl: HTMLInputElement | undefined = $state();
  let historyListEl: HTMLUListElement | undefined = $state();

  const preview = $derived.by(() => {
    if (!expression.trim()) return "";
    try {
      return formatNumber(evaluate(expression, angleMode));
    } catch {
      return "";
    }
  });

  const progValue = $derived.by((): bigint | null => {
    try {
      return parseInBase(progText, base);
    } catch {
      return null;
    }
  });
  const binView = $derived(progValue !== null ? formatInBase(progValue, 2, bitWidth) : "—");
  const octView = $derived(progValue !== null ? formatInBase(progValue, 8, bitWidth) : "—");
  const decView = $derived(progValue !== null ? maskToWidth(progValue, bitWidth).toString() : "—");
  const hexView = $derived(progValue !== null ? formatInBase(progValue, 16, bitWidth).toUpperCase() : "—");
  const signedView = $derived(progValue !== null ? toSigned(progValue, bitWidth).toString() : "—");

  $effect(() => {
    if (focused) {
      const target = calcMode === "scientific" ? inputEl : progInputEl;
      queueMicrotask(() => target?.focus());
    }
  });

  $effect(() => {
    if (selectedHistory !== null && historyListEl) {
      const item = historyListEl.children[selectedHistory] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  });

  function moveHistorySelection(delta: number) {
    if (history.length === 0) return;
    if (selectedHistory === null) {
      if (delta < 0) selectedHistory = history.length - 1;
      return;
    }
    const next = selectedHistory + delta;
    if (next < 0) selectedHistory = 0;
    else if (next >= history.length) selectedHistory = null;
    else selectedHistory = next;
  }

  function evaluateAndCommit() {
    const expr = expression.trim();
    if (!expr) return;
    try {
      const value = evaluate(expr, angleMode);
      history.push({ input: expr, result: formatNumber(value) });
    } catch (err) {
      history.push({ input: expr, result: err instanceof Error ? err.message : "Error", error: true });
    }
    expression = "";
    selectedHistory = null;
  }

  function deferToWm(e: KeyboardEvent): boolean {
    return vimState.mode === "Leader" || vimState.mode === "Command";
  }

  function onSciKeydown(e: KeyboardEvent) {
    if (deferToWm(e)) return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;

    if (e.key === "j") {
      e.preventDefault();
      e.stopPropagation();
      moveHistorySelection(1);
      return;
    }
    if (e.key === "k") {
      e.preventDefault();
      e.stopPropagation();
      moveHistorySelection(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (selectedHistory !== null) {
        expression = history[selectedHistory].input;
        selectedHistory = null;
        queueMicrotask(() => inputEl?.focus());
      } else {
        evaluateAndCommit();
      }
      return;
    }
    e.stopPropagation();
  }

  function onProgKeydown(e: KeyboardEvent) {
    if (deferToWm(e)) return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    if (e.key.length === 1 && e.key !== "-" && !isValidDigit(e.key, base)) {
      e.preventDefault();
    }
    e.stopPropagation();
  }

  function applyOp(op: BitwiseOp) {
    if (progValue === null) return;
    let b = 0n;
    try {
      b = parseInBase(operandBText, base);
    } catch {
      b = 0n;
    }
    const result = applyBitwise(op, progValue, b, bitWidth);
    progText = formatInBase(result, base, bitWidth);
  }

  function setBase(next: Base) {
    base = next;
  }
</script>

<div class="calculator">
  <div class="mode-tabs">
    <button type="button" class:active={calcMode === "scientific"} onclick={() => (calcMode = "scientific")}>
      Scientific
    </button>
    <button type="button" class:active={calcMode === "programmer"} onclick={() => (calcMode = "programmer")}>
      Programmer
    </button>
  </div>

  {#if calcMode === "scientific"}
    <div class="display">
      <input
        bind:this={inputEl}
        bind:value={expression}
        onkeydown={onSciKeydown}
        placeholder="0"
        spellcheck="false"
        autocomplete="off"
      />
      <div class="preview">{preview}</div>
    </div>

    <div class="angle-toggle">
      <button type="button" class:active={angleMode === "rad"} onclick={() => (angleMode = "rad")}>RAD</button>
      <button type="button" class:active={angleMode === "deg"} onclick={() => (angleMode = "deg")}>DEG</button>
      <span class="hint">j/k: history &middot; Enter: evaluate / reuse</span>
    </div>

    <ul class="history" bind:this={historyListEl}>
      {#each history as entry, i (i)}
        <li class:selected={i === selectedHistory} class:error={entry.error}>
          <span class="hist-input">{entry.input}</span>
          <span class="hist-result">{entry.result}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="prog-input-row">
      <div class="base-tabs">
        {#each [2, 8, 10, 16] as b (b)}
          <button type="button" class:active={base === b} onclick={() => setBase(b as Base)}>
            {b === 2 ? "BIN" : b === 8 ? "OCT" : b === 10 ? "DEC" : "HEX"}
          </button>
        {/each}
      </div>
      <input
        bind:this={progInputEl}
        bind:value={progText}
        onkeydown={onProgKeydown}
        spellcheck="false"
        autocomplete="off"
      />
    </div>

    <div class="base-views">
      <div><span class="base-label">BIN</span>{binView}</div>
      <div><span class="base-label">OCT</span>{octView}</div>
      <div><span class="base-label">DEC</span>{decView} <span class="signed">(signed {signedView})</span></div>
      <div><span class="base-label">HEX</span>{hexView}</div>
    </div>

    <div class="bitwidth-toggle">
      {#each [8, 16, 32, 64] as w (w)}
        <button type="button" class:active={bitWidth === w} onclick={() => (bitWidth = w as BitWidth)}>{w}-bit</button>
      {/each}
    </div>

    <div class="operand-row">
      <span>B =</span>
      <input bind:value={operandBText} onkeydown={onProgKeydown} spellcheck="false" autocomplete="off" />
    </div>

    <div class="bitwise-ops">
      <button type="button" onclick={() => applyOp("and")}>AND</button>
      <button type="button" onclick={() => applyOp("or")}>OR</button>
      <button type="button" onclick={() => applyOp("xor")}>XOR</button>
      <button type="button" onclick={() => applyOp("not")}>NOT</button>
      <button type="button" onclick={() => applyOp("shl")}>SHL</button>
      <button type="button" onclick={() => applyOp("shr")}>SHR</button>
    </div>
  {/if}
</div>

<style>
  .calculator {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.75rem;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
  }

  .mode-tabs,
  .angle-toggle,
  .base-tabs,
  .bitwidth-toggle,
  .bitwise-ops {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  button {
    font: inherit;
    font-size: 0.8rem;
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

  .display {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .display input,
  .prog-input-row input,
  .operand-row input {
    font: inherit;
    font-size: 1.3rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.4rem 0.6rem;
    width: 100%;
    box-sizing: border-box;
    outline: none;
  }
  .display input:focus,
  .prog-input-row input:focus,
  .operand-row input:focus {
    border-color: var(--accent);
  }
  .preview {
    min-height: 1.2rem;
    text-align: right;
    opacity: 0.6;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }

  .hint {
    margin-left: auto;
    font-size: 0.7rem;
    opacity: 0.5;
    align-self: center;
  }

  .history {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.15rem;
  }
  .history li {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.85rem;
  }
  .history li.selected {
    background: var(--accent);
    color: var(--background);
  }
  .history li.error .hist-result {
    color: var(--error);
  }
  .history li.selected.error .hist-result {
    color: var(--background);
  }
  .hist-input {
    opacity: 0.75;
  }
  .history li.selected .hist-input {
    opacity: 1;
  }

  .prog-input-row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .base-views {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.85rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem 0.6rem;
  }
  .base-label {
    display: inline-block;
    width: 3rem;
    opacity: 0.6;
  }
  .signed {
    opacity: 0.6;
  }
  .operand-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
