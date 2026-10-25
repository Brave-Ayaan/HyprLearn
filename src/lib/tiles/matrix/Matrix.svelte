<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { Matrix, vectorDot, vectorCross, vectorNorm } from "../../math/matrix";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let rowsA = $state(2);
  let colsA = $state(2);
  let rowsB = $state(2);
  let colsB = $state(2);
  let a: number[][] = $state([
    [1, 2],
    [3, 4],
  ]);
  let b: number[][] = $state([
    [5, 6],
    [7, 8],
  ]);

  let vecA = $state("1,0,0");
  let vecB = $state("0,1,0");

  interface ResultEntry {
    label: string;
    grid?: number[][];
    scalar?: string;
    steps?: string[];
  }
  let results: ResultEntry[] = $state([]);

  function resize(grid: number[][], rows: number, cols: number): number[][] {
    const out: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) row.push(grid[r]?.[c] ?? 0);
      out.push(row);
    }
    return out;
  }

  function setRowsA(n: number) {
    rowsA = Math.max(1, Math.min(6, n));
    a = resize(a, rowsA, colsA);
  }
  function setColsA(n: number) {
    colsA = Math.max(1, Math.min(6, n));
    a = resize(a, rowsA, colsA);
  }
  function setRowsB(n: number) {
    rowsB = Math.max(1, Math.min(6, n));
    b = resize(b, rowsB, colsB);
  }
  function setColsB(n: number) {
    colsB = Math.max(1, Math.min(6, n));
    b = resize(b, rowsB, colsB);
  }

  function fmt(n: number): string {
    if (!Number.isFinite(n)) return String(n);
    const r = Math.round(n * 1e6) / 1e6;
    return Object.is(r, -0) ? "0" : r.toString();
  }

  function pushError(label: string, err: unknown) {
    results.push({ label, scalar: err instanceof Error ? err.message : "Error" });
  }

  function doAdd() {
    try {
      results.push({ label: "A + B", grid: new Matrix(a).add(new Matrix(b)).data });
    } catch (err) {
      pushError("A + B", err);
    }
  }
  function doSub() {
    try {
      results.push({ label: "A - B", grid: new Matrix(a).sub(new Matrix(b)).data });
    } catch (err) {
      pushError("A - B", err);
    }
  }
  function doMul() {
    try {
      results.push({ label: "A × B", grid: new Matrix(a).multiply(new Matrix(b)).data });
    } catch (err) {
      pushError("A × B", err);
    }
  }
  function doTranspose() {
    try {
      results.push({ label: "A^T", grid: new Matrix(a).transpose().data });
    } catch (err) {
      pushError("A^T", err);
    }
  }
  function doDet() {
    try {
      results.push({ label: "det(A)", scalar: fmt(new Matrix(a).determinant()) });
    } catch (err) {
      pushError("det(A)", err);
    }
  }
  function doInverse() {
    try {
      const inv = new Matrix(a).inverse();
      if (inv) results.push({ label: "A⁻¹", grid: inv.data });
      else results.push({ label: "A⁻¹", scalar: "Singular matrix: no inverse" });
    } catch (err) {
      pushError("A⁻¹", err);
    }
  }
  function doRref() {
    try {
      const { result, steps } = new Matrix(a).rref();
      results.push({ label: "RREF(A)", grid: result.data, steps });
    } catch (err) {
      pushError("RREF(A)", err);
    }
  }
  function doEigen() {
    try {
      const vals = new Matrix(a).eigenvalues();
      const text = vals.map((v) => (Math.abs(v.im) < 1e-6 ? fmt(v.re) : `${fmt(v.re)} ${v.im >= 0 ? "+" : "-"} ${fmt(Math.abs(v.im))}i`)).join(", ");
      results.push({ label: "eigenvalues(A)", scalar: text });
    } catch (err) {
      pushError("eigenvalues(A)", err);
    }
  }

  function parseVec(s: string): number[] {
    return s
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .map(Number);
  }

  function doDot() {
    try {
      results.push({ label: "a · b", scalar: fmt(vectorDot(parseVec(vecA), parseVec(vecB))) });
    } catch (err) {
      pushError("a · b", err);
    }
  }
  function doCross() {
    try {
      results.push({ label: "a × b", scalar: `(${vectorCross(parseVec(vecA), parseVec(vecB)).map(fmt).join(", ")})` });
    } catch (err) {
      pushError("a × b", err);
    }
  }
  function doNorm() {
    try {
      results.push({ label: "|a|", scalar: fmt(vectorNorm(parseVec(vecA))) });
    } catch (err) {
      pushError("|a|", err);
    }
  }

  let hostEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (focused) queueMicrotask(() => hostEl?.querySelector("input")?.focus());
  });
</script>

<div class="matrix-tile" bind:this={hostEl}>
  <div class="matrices">
    <div class="matrix-editor">
      <div class="editor-head">
        <span>A</span>
        <button type="button" onclick={() => setRowsA(rowsA - 1)}>−r</button>
        <button type="button" onclick={() => setRowsA(rowsA + 1)}>+r</button>
        <button type="button" onclick={() => setColsA(colsA - 1)}>−c</button>
        <button type="button" onclick={() => setColsA(colsA + 1)}>+c</button>
      </div>
      <div class="grid" style="grid-template-columns: repeat({colsA}, 3.2rem);">
        {#each a as row, r (r)}
          {#each row as _, c (c)}
            <input
              type="number"
              bind:value={a[r][c]}
              onfocus={() => vimState.enterInsert()}
              onblur={() => vimState.enterNormal()}
            />
          {/each}
        {/each}
      </div>
    </div>

    <div class="matrix-editor">
      <div class="editor-head">
        <span>B</span>
        <button type="button" onclick={() => setRowsB(rowsB - 1)}>−r</button>
        <button type="button" onclick={() => setRowsB(rowsB + 1)}>+r</button>
        <button type="button" onclick={() => setColsB(colsB - 1)}>−c</button>
        <button type="button" onclick={() => setColsB(colsB + 1)}>+c</button>
      </div>
      <div class="grid" style="grid-template-columns: repeat({colsB}, 3.2rem);">
        {#each b as row, r (r)}
          {#each row as _, c (c)}
            <input type="number" bind:value={b[r][c]} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
          {/each}
        {/each}
      </div>
    </div>
  </div>

  <div class="ops">
    <button type="button" onclick={doAdd}>A+B</button>
    <button type="button" onclick={doSub}>A-B</button>
    <button type="button" onclick={doMul}>A×B</button>
    <button type="button" onclick={doTranspose}>Aᵗ</button>
    <button type="button" onclick={doDet}>det(A)</button>
    <button type="button" onclick={doInverse}>A⁻¹</button>
    <button type="button" onclick={doRref}>RREF(A)</button>
    <button type="button" onclick={doEigen}>eig(A)</button>
  </div>

  <div class="vectors">
    <label>a = (<input bind:value={vecA} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />)</label>
    <label>b = (<input bind:value={vecB} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />)</label>
    <button type="button" onclick={doDot}>a·b</button>
    <button type="button" onclick={doCross}>a×b</button>
    <button type="button" onclick={doNorm}>|a|</button>
  </div>

  <div class="results">
    {#each results as r, i (i)}
      <div class="result">
        <div class="result-label">{r.label}</div>
        {#if r.grid}
          <div class="result-grid" style="grid-template-columns: repeat({r.grid[0]?.length ?? 1}, auto);">
            {#each r.grid as row, ri (ri)}
              {#each row as v, ci (ci)}
                <span class="cell">{fmt(v)}</span>
              {/each}
            {/each}
          </div>
        {:else}
          <div class="result-scalar">{r.scalar}</div>
        {/if}
        {#if r.steps?.length}
          <details>
            <summary>{r.steps.length} steps</summary>
            <ol>
              {#each r.steps as step, si (si)}<li>{step}</li>{/each}
            </ol>
          </details>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .matrix-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.7rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
    overflow-y: auto;
  }
  .matrices {
    display: flex;
    gap: 1.2rem;
    flex-wrap: wrap;
  }
  .editor-head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.3rem;
    font-weight: 600;
  }
  .grid {
    display: grid;
    gap: 0.25rem;
  }
  .grid input {
    width: 3.2rem;
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem;
    text-align: center;
  }
  button {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .ops {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .vectors {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .vectors label {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }
  .vectors input {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.4rem;
    width: 6rem;
  }
  .results {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .result {
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.45rem 0.6rem;
  }
  .result-label {
    font-weight: 600;
    font-size: 0.78rem;
    opacity: 0.8;
    margin-bottom: 0.25rem;
  }
  .result-grid {
    display: inline-grid;
    gap: 0.3rem;
  }
  .cell {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.04);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    text-align: right;
  }
  .result-scalar {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  details {
    margin-top: 0.4rem;
    font-size: 0.72rem;
    opacity: 0.8;
  }
  ol {
    margin: 0.3rem 0 0;
    padding-left: 1.2rem;
  }
</style>
