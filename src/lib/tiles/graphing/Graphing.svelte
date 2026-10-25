<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { parse, evaluate } from "../../math/ast";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Mode = "cartesian" | "parametric" | "polar";

  interface PlotFn {
    id: number;
    expr: string; // cartesian: f(x)   parametric: "x(t); y(t)"   polar: r(theta)
    color: string;
    visible: boolean;
    error: string | null;
  }

  interface Slider {
    name: string;
    value: number;
    min: number;
    max: number;
    step: number;
  }

  const PALETTE = ["#cba6f7", "#89b4fa", "#a6e3a1", "#f9e2af", "#fab387", "#f38ba8"];
  let nextFnId = 1;

  let mode: Mode = $state("cartesian");
  let fns: PlotFn[] = $state([{ id: nextFnId++, expr: "sin(x)", color: PALETTE[0], visible: true, error: null }]);
  let sliders: Slider[] = $state([]);

  let xMin = $state(-10);
  let xMax = $state(10);
  let yMin = $state(-6);
  let yMax = $state(6);
  let tRange = $state({ min: 0, max: 2 * Math.PI });

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let hostEl: HTMLDivElement | undefined = $state();
  let dragging = false;
  let dragStart = { x: 0, y: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 };

  function sliderEnv(): Record<string, number> {
    const env: Record<string, number> = {};
    for (const s of sliders) env[s.name] = s.value;
    return env;
  }

  function addFn() {
    fns.push({ id: nextFnId++, expr: "", color: PALETTE[fns.length % PALETTE.length], visible: true, error: null });
  }
  function removeFn(fid: number) {
    fns = fns.filter((f) => f.id !== fid);
  }
  function addSlider() {
    sliders.push({ name: `a${sliders.length}`, value: 1, min: -10, max: 10, step: 0.1 });
  }
  function removeSlider(i: number) {
    sliders.splice(i, 1);
  }

  function resetView() {
    xMin = -10;
    xMax = 10;
    yMin = -6;
    yMax = 6;
  }

  function resizeCanvas() {
    if (!canvasEl || !hostEl) return;
    const rect = hostEl.getBoundingClientRect();
    canvasEl.width = Math.max(1, Math.floor(rect.width));
    canvasEl.height = Math.max(1, Math.floor(rect.height));
  }

  function toPx(x: number, y: number, w: number, h: number) {
    return { px: ((x - xMin) / (xMax - xMin)) * w, py: h - ((y - yMin) / (yMax - yMin)) * h };
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    const stepX = niceStep((xMax - xMin) / 10);
    const stepY = niceStep((yMax - yMin) / 8);
    for (let x = Math.ceil(xMin / stepX) * stepX; x <= xMax; x += stepX) {
      const { px } = toPx(x, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
    }
    for (let y = Math.ceil(yMin / stepY) * stepY; y <= yMax; y += stepY) {
      const { py } = toPx(0, y, w, h);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    const origin = toPx(0, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(0, origin.py);
    ctx.lineTo(w, origin.py);
    ctx.moveTo(origin.px, 0);
    ctx.lineTo(origin.px, h);
    ctx.stroke();
  }

  function niceStep(raw: number): number {
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    const nice = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return nice * pow;
  }

  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);
    const env0 = sliderEnv();

    for (const fn of fns) {
      if (!fn.visible || !fn.expr.trim()) continue;
      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 2;
      try {
        if (mode === "cartesian") {
          const expr = parse(fn.expr);
          ctx.beginPath();
          let first = true;
          for (let px = 0; px <= w; px++) {
            const x = xMin + (px / w) * (xMax - xMin);
            let y: number;
            try {
              y = evaluate(expr, { x, ...env0 });
            } catch {
              first = true;
              continue;
            }
            if (!Number.isFinite(y) || y < yMin - (yMax - yMin) || y > yMax + (yMax - yMin)) {
              first = true;
              continue;
            }
            const { py } = toPx(x, y, w, h);
            if (first) {
              ctx.moveTo(px, py);
              first = false;
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        } else if (mode === "parametric") {
          const [xExprStr, yExprStr] = fn.expr.split(";").map((s) => s.trim());
          const xExpr = parse(xExprStr ?? "0");
          const yExpr = parse(yExprStr ?? "0");
          const steps = 800;
          ctx.beginPath();
          let first = true;
          for (let i = 0; i <= steps; i++) {
            const t = tRange.min + (i / steps) * (tRange.max - tRange.min);
            const env = { t, ...env0 };
            const x = evaluate(xExpr, env);
            const y = evaluate(yExpr, env);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              first = true;
              continue;
            }
            const { px, py } = toPx(x, y, w, h);
            if (first) {
              ctx.moveTo(px, py);
              first = false;
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        } else {
          const expr = parse(fn.expr);
          const steps = 1000;
          ctx.beginPath();
          let first = true;
          for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * 2 * Math.PI;
            const env = { theta, ...env0 };
            const r = evaluate(expr, env);
            if (!Number.isFinite(r)) {
              first = true;
              continue;
            }
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            const { px, py } = toPx(x, y, w, h);
            if (first) {
              ctx.moveTo(px, py);
              first = false;
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        }
        fn.error = null;
      } catch (err) {
        fn.error = err instanceof Error ? err.message : "parse error";
      }
    }
  }

  $effect(() => {
    // re-render whenever any plotted state changes
    void [mode, fns.map((f) => f.expr + f.color + f.visible).join(), sliders.map((s) => s.value).join(), xMin, xMax, yMin, yMax, tRange.min, tRange.max];
    draw();
  });

  $effect(() => {
    if (!hostEl) return;
    resizeCanvas();
    draw();
    const ro = new ResizeObserver(() => {
      resizeCanvas();
      draw();
    });
    ro.observe(hostEl);
    return () => ro.disconnect();
  });

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const cx = (xMin + xMax) / 2;
    const cy = (yMin + yMax) / 2;
    const hw = ((xMax - xMin) / 2) * factor;
    const hh = ((yMax - yMin) / 2) * factor;
    xMin = cx - hw;
    xMax = cx + hw;
    yMin = cy - hh;
    yMax = cy + hh;
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, xMin, xMax, yMin, yMax };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging || !canvasEl) return;
    const dx = ((e.clientX - dragStart.x) / canvasEl.width) * (dragStart.xMax - dragStart.xMin);
    const dy = ((e.clientY - dragStart.y) / canvasEl.height) * (dragStart.yMax - dragStart.yMin);
    xMin = dragStart.xMin - dx;
    xMax = dragStart.xMax - dx;
    yMin = dragStart.yMin + dy;
    yMax = dragStart.yMax + dy;
  }
  function onPointerUp() {
    dragging = false;
  }
</script>

<div class="graphing-tile">
  <div class="sidebar">
    <div class="mode-tabs">
      <button type="button" class:active={mode === "cartesian"} onclick={() => (mode = "cartesian")}>y = f(x)</button>
      <button type="button" class:active={mode === "parametric"} onclick={() => (mode = "parametric")}>param</button>
      <button type="button" class:active={mode === "polar"} onclick={() => (mode = "polar")}>polar</button>
    </div>

    <div class="fn-list">
      {#each fns as fn (fn.id)}
        <div class="fn-row">
          <input type="color" bind:value={fn.color} />
          <input
            class="fn-expr"
            bind:value={fn.expr}
            placeholder={mode === "cartesian" ? "f(x), e.g. sin(x)" : mode === "parametric" ? "x(t); y(t)" : "r(theta)"}
            onfocus={() => vimState.enterInsert()}
            onblur={() => vimState.enterNormal()}
            spellcheck="false"
          />
          <button type="button" class="toggle" onclick={() => (fn.visible = !fn.visible)}>{fn.visible ? "👁" : "—"}</button>
          <button type="button" class="danger" onclick={() => removeFn(fn.id)}>×</button>
        </div>
        {#if fn.error}<div class="fn-error">{fn.error}</div>{/if}
      {/each}
      <button type="button" onclick={addFn}>+ function</button>
    </div>

    {#if mode === "parametric"}
      <div class="range-row">
        <span>t:</span>
        <input type="number" bind:value={tRange.min} step="0.1" />
        <span>to</span>
        <input type="number" bind:value={tRange.max} step="0.1" />
      </div>
    {/if}

    <div class="sliders">
      {#each sliders as s, i (s.name)}
        <div class="slider-row">
          <input
            class="slider-name"
            bind:value={s.name}
            onfocus={() => vimState.enterInsert()}
            onblur={() => vimState.enterNormal()}
            spellcheck="false"
          />
          <input type="range" min={s.min} max={s.max} step={s.step} bind:value={s.value} />
          <span class="slider-val">{s.value}</span>
          <button type="button" class="danger" onclick={() => removeSlider(i)}>×</button>
        </div>
      {/each}
      <button type="button" onclick={addSlider}>+ slider</button>
    </div>

    <button type="button" onclick={resetView}>Reset view</button>
  </div>

  <div class="canvas-host" bind:this={hostEl}>
    <canvas
      bind:this={canvasEl}
      onwheel={onWheel}
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointerleave={onPointerUp}
    ></canvas>
  </div>
</div>

<style>
  .graphing-tile {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.8rem;
  }
  .sidebar {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.6rem;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    overflow-y: auto;
  }
  .mode-tabs {
    display: flex;
    gap: 0.3rem;
  }
  button {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
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
  button.danger {
    border-color: rgba(243, 139, 168, 0.4);
    color: var(--error);
    padding: 0.15rem 0.4rem;
  }
  input {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.4rem;
  }
  input[type="color"] {
    width: 1.8rem;
    padding: 0.1rem;
  }
  .fn-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .fn-row {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .fn-expr {
    flex: 1;
    min-width: 0;
  }
  .fn-error {
    font-size: 0.68rem;
    color: var(--error);
    padding-left: 0.2rem;
  }
  .range-row,
  .slider-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .slider-name {
    width: 3rem;
  }
  .slider-row input[type="range"] {
    flex: 1;
  }
  .slider-val {
    width: 2.5rem;
    text-align: right;
    font-size: 0.7rem;
    opacity: 0.7;
  }
  .sliders {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .canvas-host {
    flex: 1;
    min-width: 0;
    position: relative;
  }
  canvas {
    position: absolute;
    inset: 0;
    cursor: grab;
    touch-action: none;
  }
</style>
