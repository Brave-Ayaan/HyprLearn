<script lang="ts">
  import { stepSimulation, makeBody, type Body, type SimParams } from "./engine";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let gravity = $state(600);
  let restitution = $state(0.75);
  let drag = $state(0.05);
  let running = $state(true);

  let bodies: Body[] = $state([]);
  let nextId = 0;

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let hostEl: HTMLDivElement | undefined = $state();
  let width = 0;
  let height = 0;
  let rafId: number | null = null;
  let lastTs = 0;

  let draggingId: number | null = $state(null);
  let history: { x: number; y: number; t: number }[] = [];

  function resize() {
    if (!canvasEl || !hostEl) return;
    const rect = hostEl.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvasEl.width = width;
    canvasEl.height = height;
  }

  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    if (draggingId !== null) {
      const b = bodies.find((x) => x.id === draggingId);
      if (b && history.length) {
        const last = history[history.length - 1];
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const b of bodies) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.globalAlpha = b.pinned ? 0.6 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (b.id === draggingId) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  function tick(ts: number) {
    const dtReal = lastTs ? Math.min((ts - lastTs) / 1000, 0.033) : 0;
    lastTs = ts;
    if (running) {
      const params: SimParams = { gravity, restitution, drag };
      stepSimulation(bodies, width, height, dtReal, params);
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
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
    return () => {
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  });

  function hitTest(x: number, y: number): Body | undefined {
    return bodies.find((b) => Math.hypot(b.x - x, b.y - y) <= b.r);
  }

  function pointerPos(e: PointerEvent): { x: number; y: number } {
    const rect = canvasEl!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: PointerEvent) {
    const { x, y } = pointerPos(e);
    let target = hitTest(x, y);
    if (!target) {
      target = makeBody(nextId++, x, y);
      bodies.push(target);
    } else {
      target.pinned = true;
    }
    draggingId = target.id;
    history = [{ x, y, t: performance.now() }];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (draggingId === null) return;
    const { x, y } = pointerPos(e);
    const b = bodies.find((body) => body.id === draggingId);
    if (b) {
      b.x = x;
      b.y = y;
    }
    history.push({ x, y, t: performance.now() });
    if (history.length > 6) history.shift();
  }

  function onPointerUp() {
    if (draggingId === null) return;
    const b = bodies.find((body) => body.id === draggingId);
    if (b && history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = Math.max((last.t - first.t) / 1000, 1 / 120);
      b.vx = (last.x - first.x) / dt;
      b.vy = (last.y - first.y) / dt;
      b.pinned = false;
    }
    draggingId = null;
    history = [];
  }

  function clearAll() {
    bodies = [];
  }

  function toggleRun() {
    running = !running;
    lastTs = 0;
  }
</script>

<div class="sandbox-tile">
  <div class="toolbar">
    <button type="button" onclick={toggleRun}>{running ? "Pause" : "Play"}</button>
    <button type="button" onclick={clearAll}>Clear</button>
    <label>gravity <input type="range" min="0" max="2000" bind:value={gravity} /></label>
    <label>bounce <input type="range" min="0" max="1" step="0.05" bind:value={restitution} /></label>
    <label>drag <input type="range" min="0" max="0.5" step="0.01" bind:value={drag} /></label>
    <span class="count">{bodies.length} bodies</span>
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
  <p class="hint">Click empty space to drop a ball, drag before releasing to fling it (slingshot-style). Drag an existing ball to re-throw it.</p>
</div>

<style>
  .sandbox-tile {
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
    gap: 0.6rem;
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
  label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    opacity: 0.8;
  }
  .count {
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
