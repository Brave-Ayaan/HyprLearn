<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { parse, simplify, derivative, toLatex, evaluate, findRoots, integrate, type Expr } from "../../math/ast";
  import Katex from "../../components/Katex.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let input = $state("x^2 + 2*x + 1");
  let wrt = $state("x");
  let solveMin = $state(-10);
  let solveMax = $state(10);
  let intA = $state(0);
  let intB = $state(1);
  let inputEl: HTMLInputElement | undefined = $state();

  type OpKind = "simplify" | "derivative" | "solve" | "integrate";
  interface HistoryEntry {
    kind: OpKind;
    inputLatex: string;
    resultLatex?: string;
    resultText: string;
    error?: boolean;
  }
  let history: HistoryEntry[] = $state([]);

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  function parsed(): Expr {
    return parse(input);
  }

  function pushHistory(entry: HistoryEntry) {
    history.push(entry);
  }

  function runSimplify() {
    try {
      const expr = parsed();
      const result = simplify(expr);
      pushHistory({ kind: "simplify", inputLatex: toLatex(expr), resultLatex: toLatex(result), resultText: toLatex(result) });
    } catch (err) {
      pushHistory({ kind: "simplify", inputLatex: input, resultText: message(err), error: true });
    }
  }

  function runDerivative() {
    try {
      const expr = parsed();
      const d = simplify(derivative(expr, wrt.trim() || "x"));
      pushHistory({
        kind: "derivative",
        inputLatex: `\\frac{d}{d${wrt.trim() || "x"}}\\left(${toLatex(expr)}\\right)`,
        resultLatex: toLatex(d),
        resultText: toLatex(d),
      });
    } catch (err) {
      pushHistory({ kind: "derivative", inputLatex: input, resultText: message(err), error: true });
    }
  }

  function runSolve() {
    try {
      const expr = parsed();
      const roots = findRoots((x) => evaluate(expr, { x }), solveMin, solveMax);
      const rounded = roots.map((r) => Math.round(r * 1e6) / 1e6);
      const unique = [...new Set(rounded)];
      pushHistory({
        kind: "solve",
        inputLatex: `${toLatex(expr)} = 0`,
        resultText: unique.length ? `x ≈ ${unique.join(", ")}` : "No real roots found in range",
      });
    } catch (err) {
      pushHistory({ kind: "solve", inputLatex: input, resultText: message(err), error: true });
    }
  }

  function runIntegrate() {
    try {
      const expr = parsed();
      const value = integrate((x) => evaluate(expr, { x }), intA, intB);
      pushHistory({
        kind: "integrate",
        inputLatex: `\\int_{${intA}}^{${intB}} ${toLatex(expr)}\\,dx`,
        resultText: `≈ ${value.toPrecision(8)}`,
      });
    } catch (err) {
      pushHistory({ kind: "integrate", inputLatex: input, resultText: message(err), error: true });
    }
  }

  function message(err: unknown): string {
    return err instanceof Error ? err.message : "Error";
  }

  function toLatexSafe(text: string): string {
    try {
      return toLatex(parse(text));
    } catch {
      return "\\text{...}";
    }
  }

  const previewLatex = $derived(toLatexSafe(input));

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      runSimplify();
      return;
    }
    e.stopPropagation();
  }
</script>

<div class="cas-tile">
  <div class="input-row">
    <input
      bind:this={inputEl}
      bind:value={input}
      onkeydown={onKeydown}
      placeholder="Enter an expression, e.g. x^2 + 2x + 1"
      spellcheck="false"
    />
  </div>
  <div class="preview"><Katex tex={previewLatex} display={true} /></div>

  <div class="ops">
    <button type="button" onclick={runSimplify}>Simplify</button>
    <div class="op-group">
      <span>d/d</span>
      <input class="small" bind:value={wrt} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
      <button type="button" onclick={runDerivative}>Differentiate</button>
    </div>
    <div class="op-group">
      <span>solve = 0 in [</span>
      <input class="small" type="number" bind:value={solveMin} />
      <span>,</span>
      <input class="small" type="number" bind:value={solveMax} />
      <span>]</span>
      <button type="button" onclick={runSolve}>Solve</button>
    </div>
    <div class="op-group">
      <span>&int; from</span>
      <input class="small" type="number" bind:value={intA} />
      <span>to</span>
      <input class="small" type="number" bind:value={intB} />
      <button type="button" onclick={runIntegrate}>Integrate</button>
    </div>
  </div>

  <ul class="history">
    {#each history as entry, i (i)}
      <li class:error={entry.error}>
        <div class="entry-input">
          <Katex tex={entry.inputLatex} />
        </div>
        <div class="entry-result">
          {#if entry.resultLatex && !entry.error}
            = <Katex tex={entry.resultLatex} />
          {:else}
            {entry.resultText}
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  .cas-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.75rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.85rem;
  }
  .input-row input {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    font-size: 1.05rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.4rem 0.6rem;
    outline: none;
  }
  .input-row input:focus {
    border-color: var(--accent);
  }
  .preview {
    min-height: 1.6rem;
    padding: 0.3rem 0.2rem;
    font-size: 1.1rem;
  }
  .ops {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
  }
  .op-group {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    opacity: 0.85;
  }
  input.small {
    width: 3.2rem;
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.15rem 0.3rem;
  }
  button {
    font: inherit;
    font-size: 0.78rem;
    padding: 0.25rem 0.6rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .history {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.3rem;
  }
  .history li {
    padding: 0.4rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    background: rgba(255, 255, 255, 0.03);
  }
  .history li.error .entry-result {
    color: var(--error);
  }
  .entry-input {
    opacity: 0.7;
    font-size: 0.85rem;
  }
  .entry-result {
    margin-top: 0.15rem;
  }
</style>
