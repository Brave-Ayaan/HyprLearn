<script lang="ts">
  import { LifeGrid } from "./engine";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  const CELL_SIZE = 12;
  let grid: LifeGrid = $state(new LifeGrid(40, 30));
  let generation = $state(0);
  let running = $state(false);
  let speed = $state(8); // generations per second

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let hostEl: HTMLDivElement | undefined = $state();
  let width = 0;
  let height = 0;
  let rafId: number | null = null;
  let lastStepTs = 0;
  let painting: 0 | 1 | null = null;

  function resize() {
    if (!canvasEl || !hostEl) return;
    const rect = hostEl.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvasEl.width = width;
    canvasEl.height = height;
    const cols = Math.max(4, Math.floor(width / CELL_SIZE));
    const rows = Math.max(4, Math.floor(height / CELL_SIZE));
    if (cols !== grid.cols || rows !== grid.rows) {
      const next = new LifeGrid(cols, rows);
      for (let y = 0; y < Math.min(rows, grid.rows); y++) {
        for (let x = 0; x < Math.min(cols, grid.cols); x++) {
          next.set(x, y, grid.get(x, y));
        }
      }
      grid = next;
    }
  }

  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#61afef";
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (grid.get(x, y)) {
          ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
    }
  }

  function doStep() {
    grid = grid.step();
    generation++;
  }

  function tick(ts: number) {
    if (running) {
      const interval = 1000 / speed;
      if (ts - lastStepTs >= interval) {
        doStep();
        lastStepTs = ts;
      }
    }
    draw();
    rafId = requestAnimationFrame(tick);
  }

  $effect(() => {
    if (!hostEl) return;
    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(hostEl);
    rafId = requestAnimationFrame(tick);
    return () => {
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  });

  function cellAt(e: PointerEvent): { x: number; y: number } {
    const rect = canvasEl!.getBoundingClientRect();
    return { x: Math.floor((e.clientX - rect.left) / CELL_SIZE), y: Math.floor((e.clientY - rect.top) / CELL_SIZE) };
  }

  function onPointerDown(e: PointerEvent) {
    const { x, y } = cellAt(e);
    grid.toggle(x, y);
    painting = grid.get(x, y) ? 1 : 0;
    draw();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (painting === null) return;
    const { x, y } = cellAt(e);
    grid.set(x, y, painting === 1);
    draw();
  }
  function onPointerUp() {
    painting = null;
  }

  function toggleRun() {
    running = !running;
    lastStepTs = 0;
  }
  function clearGrid() {
    grid.clear();
    generation = 0;
    draw();
  }
  function randomize() {
    grid.randomize();
    generation = 0;
    draw();
  }
</script>

<div class="life-tile">
  <div class="toolbar">
    <button type="button" onclick={toggleRun}>{running ? "Pause" : "Play"}</button>
    <button type="button" onclick={doStep} disabled={running}>Step</button>
    <button type="button" onclick={randomize}>Random</button>
    <button type="button" onclick={clearGrid}>Clear</button>
    <label>speed <input type="range" min="1" max="30" bind:value={speed} /></label>
    <span class="stat">gen {generation} &middot; {grid.liveCount()} alive</span>
  </div>
  <div class="canvas-host" bind:this={hostEl}>
    <canvas
      bind:this={canvasEl}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointerleave={onPointerUp}
    ></canvas>
  </div>
  <p class="hint">Click or drag to toggle cells, then Play. Standard Conway rules (B3/S23), edges wrap around.</p>
</div>

<style>
  .life-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.78rem;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  button {
    font: inherit;
    padding: 0.25rem 0.6rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    opacity: 0.8;
  }
  .stat {
    margin-left: auto;
    opacity: 0.55;
  }
  .canvas-host {
    flex: 1;
    min-height: 0;
    position: relative;
    border-radius: calc(var(--radius) - 2px);
    background: rgba(255, 255, 255, 0.02);
    overflow: hidden;
  }
  canvas {
    position: absolute;
    inset: 0;
    cursor: crosshair;
    touch-action: none;
  }
  .hint {
    margin: 0;
    opacity: 0.45;
    font-size: 0.7rem;
  }
</style>
