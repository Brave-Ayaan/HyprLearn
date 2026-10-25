<script lang="ts">
  import { generatePoints, meanSquaredError, gradientStep, type Point } from "./engine";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let points: Point[] = $state(generatePoints(30, 1.4, 2, 3));
  let m = $state(0);
  let b = $state(0);
  let lr = $state(0.01);
  let noise = $state(3);
  let running = $state(false);
  let stepCount = $state(0);
  let lossHistory: number[] = $state([]);

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let hostEl: HTMLDivElement | undefined = $state();
  let width = 0;
  let height = 0;
  let rafId: number | null = null;
  let lastStepTs = 0;

  const xDomain: [number, number] = [-11, 11];
  const yDomain = $derived.by((): [number, number] => {
    const ys = points.map((p) => p.y);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const pad = (hi - lo) * 0.25 || 1;
    return [lo - pad, hi + pad];
  });

  const loss = $derived(meanSquaredError(points, m, b));

  function toPx(x: number, y: number): [number, number] {
    const [x0, x1] = xDomain;
    const [y0, y1] = yDomain;
    const px = ((x - x0) / (x1 - x0)) * width;
    const py = height - ((y - y0) / (y1 - y0)) * height;
    return [px, py];
  }

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

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    const [zx] = toPx(0, 0);
    const [, zy] = toPx(0, 0);
    ctx.beginPath();
    ctx.moveTo(zx, 0);
    ctx.lineTo(zx, height);
    ctx.moveTo(0, zy);
    ctx.lineTo(width, zy);
    ctx.stroke();

    ctx.fillStyle = "#61afef";
    for (const p of points) {
      const [px, py] = toPx(p.x, p.y);
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const [x0, x1] = xDomain;
    const [sx0, sy0] = toPx(x0, m * x0 + b);
    const [sx1, sy1] = toPx(x1, m * x1 + b);
    ctx.strokeStyle = "#e5c07b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
  }

  function doStep() {
    const next = gradientStep(points, m, b, lr);
    m = next.m;
    b = next.b;
    stepCount++;
    lossHistory = [...lossHistory, meanSquaredError(points, m, b)].slice(-120);
  }

  function tick(ts: number) {
    if (running) {
      if (ts - lastStepTs >= 40) {
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

  function regenerate() {
    points = generatePoints(30, 1.4, 2, noise);
    reset();
  }
  function reset() {
    m = 0;
    b = 0;
    stepCount = 0;
    lossHistory = [];
    running = false;
  }

  const sparkPath = $derived.by(() => {
    if (lossHistory.length < 2) return "";
    const maxLoss = Math.max(...lossHistory, 0.001);
    return lossHistory
      .map((l, i) => {
        const x = (i / (lossHistory.length - 1)) * 100;
        const y = 24 - (l / maxLoss) * 24;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  });
</script>

<div class="gd-tile">
  <div class="toolbar">
    <button type="button" onclick={() => (running = !running)}>{running ? "Pause" : "Run"}</button>
    <button type="button" onclick={doStep} disabled={running}>Step</button>
    <button type="button" onclick={reset}>Reset fit</button>
    <button type="button" onclick={regenerate}>New data</button>
    <label>lr <input type="number" step="0.001" min="0.0001" max="0.5" bind:value={lr} /></label>
    <label>noise <input type="number" step="0.5" min="0" max="10" bind:value={noise} /></label>
    <span class="stat">step {stepCount} &middot; loss {loss.toFixed(4)} &middot; y &approx; {m.toFixed(3)}x + {b.toFixed(3)}</span>
  </div>
  <div class="canvas-host" bind:this={hostEl}>
    <canvas bind:this={canvasEl}></canvas>
  </div>
  <div class="loss-strip">
    <span class="loss-label">loss history</span>
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" class="spark">
      <path d={sparkPath} fill="none" stroke="var(--accent)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    </svg>
  </div>
  <p class="hint">Gradient descent fits y = mx + b to the scattered points by repeatedly nudging m and b downhill on mean-squared error. Too high a learning rate makes it diverge instead of converge - try it.</p>
</div>

<style>
  .gd-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.76rem;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  button {
    font: inherit;
    font-size: 0.74rem;
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
  input {
    width: 4rem;
    font: inherit;
    font-size: 0.74rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.15rem 0.3rem;
  }
  .stat {
    margin-left: auto;
    opacity: 0.6;
    font-size: 0.72rem;
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
  }
  .loss-strip {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 1.6rem;
  }
  .loss-label {
    opacity: 0.5;
    font-size: 0.68rem;
    flex-shrink: 0;
  }
  .spark {
    flex: 1;
    height: 100%;
  }
  .hint {
    margin: 0;
    opacity: 0.45;
    font-size: 0.68rem;
  }
</style>
