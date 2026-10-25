<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { fuzzyScore } from "../../util/fuzzy";
  import { algorithms } from "./algorithms";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  interface Curve {
    label: string;
    color: string;
    fn: (n: number) => number;
    visible: boolean;
  }

  let curves: Curve[] = $state([
    { label: "O(1)", color: "#a6e3a1", fn: () => 1, visible: true },
    { label: "O(log n)", color: "#89b4fa", fn: (n) => Math.log2(Math.max(n, 1)), visible: true },
    { label: "O(n)", color: "#cba6f7", fn: (n) => n, visible: true },
    { label: "O(n log n)", color: "#f9e2af", fn: (n) => n * Math.log2(Math.max(n, 1)), visible: true },
    { label: "O(n²)", color: "#fab387", fn: (n) => n * n, visible: true },
    { label: "O(2ⁿ)", color: "#f38ba8", fn: (n) => Math.pow(2, n), visible: false },
    { label: "O(n!)", color: "#eba0ac", fn: (n) => factorial(n), visible: false },
  ]);

  function factorial(n: number): number {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  let nMax = $state(20);
  let logScale = $state(true);

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let hostEl: HTMLDivElement | undefined = $state();

  function resize() {
    if (!canvasEl || !hostEl) return;
    const rect = hostEl.getBoundingClientRect();
    canvasEl.width = Math.max(1, Math.floor(rect.width));
    canvasEl.height = Math.max(1, Math.floor(rect.height));
  }

  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    const pad = 36;
    ctx.clearRect(0, 0, w, h);

    const visible = curves.filter((c) => c.visible);
    let maxY = 1;
    for (const c of visible) {
      for (let n = 1; n <= nMax; n++) {
        const v = c.fn(n);
        if (Number.isFinite(v)) maxY = Math.max(maxY, v);
      }
    }
    const mapY = (v: number) => {
      const normalized = logScale ? Math.log(Math.max(v, 1)) / Math.log(Math.max(maxY, Math.E)) : v / maxY;
      return h - pad - normalized * (h - pad * 1.5);
    };
    const mapX = (n: number) => pad + ((n - 1) / Math.max(nMax - 1, 1)) * (w - pad * 1.3);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(w - 10, h - pad);
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad, 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "11px ui-sans-serif";
    ctx.fillText("n", w - 20, h - pad + 16);
    ctx.fillText(logScale ? "f(n), log scale" : "f(n)", pad - 30, 10);

    for (const c of visible) {
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let n = 1; n <= nMax; n++) {
        const v = c.fn(n);
        const px = mapX(n);
        const py = Number.isFinite(v) ? mapY(v) : 0;
        if (n === 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  $effect(() => {
    void [curves.map((c) => c.visible).join(), nMax, logScale];
    draw();
  });

  $effect(() => {
    if (!hostEl) return;
    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(hostEl);
    return () => ro.disconnect();
  });

  let query = $state("");
  let activeCategory: string | null = $state(null);
  const categories = $derived.by(() => [...new Set(algorithms.map((a) => a.category))]);
  const filtered = $derived.by(() => {
    let list = algorithms;
    if (activeCategory) list = list.filter((a) => a.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => fuzzyScore(q, `${a.name} ${a.category}`.toLowerCase()) >= 0);
  });
</script>

<div class="bigo-tile">
  <div class="chart-panel">
    <div class="chart-controls">
      {#each curves as c (c.label)}
        <button type="button" class:active={c.visible} style="--c: {c.color};" onclick={() => (c.visible = !c.visible)}>
          {c.label}
        </button>
      {/each}
      <label class="scale-toggle"><input type="checkbox" bind:checked={logScale} /> log scale</label>
      <label class="n-slider">n max <input type="range" min="5" max="60" bind:value={nMax} /> {nMax}</label>
    </div>
    <div class="canvas-host" bind:this={hostEl}>
      <canvas bind:this={canvasEl}></canvas>
    </div>
  </div>

  <div class="table-panel">
    <input
      placeholder="Search algorithms..."
      bind:value={query}
      onfocus={() => vimState.enterInsert()}
      onblur={() => vimState.enterNormal()}
      spellcheck="false"
    />
    <div class="chips">
      <button type="button" class:active={activeCategory === null} onclick={() => (activeCategory = null)}>all</button>
      {#each categories as cat (cat)}
        <button type="button" class:active={activeCategory === cat} onclick={() => (activeCategory = cat)}>{cat}</button>
      {/each}
    </div>
    <table>
      <thead>
        <tr><th>Algorithm</th><th>Time</th><th>Space</th></tr>
      </thead>
      <tbody>
        {#each filtered as a (a.name)}
          <tr title={a.notes}>
            <td>{a.name}</td>
            <td class="mono">{a.time}</td>
            <td class="mono">{a.space}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .bigo-tile {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.8rem;
  }
  .chart-panel {
    flex: 1.2;
    display: flex;
    flex-direction: column;
    padding: 0.6rem;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    min-width: 0;
  }
  .chart-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin-bottom: 0.4rem;
  }
  button {
    font: inherit;
    font-size: 0.72rem;
    padding: 0.2rem 0.5rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .chart-controls button {
    border-color: var(--c);
    color: var(--c);
  }
  .chart-controls button.active {
    background: var(--c);
    color: var(--background);
  }
  .scale-toggle,
  .n-slider {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    opacity: 0.8;
  }
  .canvas-host {
    flex: 1;
    position: relative;
  }
  canvas {
    position: absolute;
    inset: 0;
  }
  .table-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem;
    overflow-y: auto;
  }
  .table-panel input {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.25rem 0.5rem;
  }
  .chips {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  .chips button {
    font-size: 0.68rem;
  }
  .chips button.active {
    background: var(--accent);
    color: var(--background);
    border-color: var(--accent);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.75rem;
  }
  th {
    text-align: left;
    opacity: 0.6;
    padding: 0.25rem 0.4rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  td {
    padding: 0.25rem 0.4rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
</style>
