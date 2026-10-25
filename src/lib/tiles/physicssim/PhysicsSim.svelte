<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type SimKind = "projectile" | "pendulum" | "circuit";
  let kind: SimKind = $state("projectile");

  // Projectile params
  let v0 = $state(20);
  let angleDeg = $state(45);
  let h0 = $state(0);
  let gProj = $state(9.8);

  // Pendulum params (full nonlinear ODE, RK4 integration)
  let length = $state(1.5);
  let theta0Deg = $state(45);
  let gPend = $state(9.8);
  let damping = $state(0.05);

  // RC circuit params
  let voltage = $state(5);
  let resistance = $state(1000);
  let capacitance = $state(0.001);
  let charging = $state(true);

  let t = $state(0);
  let running = $state(false);
  let speed = $state(1);
  let rafId: number | null = null;
  let lastTs = 0;

  let canvasEl: HTMLCanvasElement | undefined = $state();
  let hostEl: HTMLDivElement | undefined = $state();

  // history of (t, value) samples for the live plot, reset on param/kind change
  let trace: { t: number; v: number }[] = $state([]);

  function reset() {
    t = 0;
    trace = [];
    pendState = { theta: (theta0Deg * Math.PI) / 180, omega: 0 };
  }

  $effect(() => {
    void [kind, v0, angleDeg, h0, gProj, length, theta0Deg, gPend, damping, voltage, resistance, capacitance, charging];
    reset();
  });

  function toggleRun() {
    running = !running;
  }

  // --- Projectile ---
  function projectilePos(time: number) {
    const rad = (angleDeg * Math.PI) / 180;
    const x = v0 * Math.cos(rad) * time;
    const y = h0 + v0 * Math.sin(rad) * time - 0.5 * gProj * time * time;
    return { x, y };
  }
  function projectileFlightTime(): number {
    const rad = (angleDeg * Math.PI) / 180;
    const vy = v0 * Math.sin(rad);
    const disc = vy * vy + 2 * gProj * h0;
    if (disc < 0) return 0;
    return (vy + Math.sqrt(disc)) / gProj;
  }

  // --- Pendulum (RK4 on theta'' = -(g/L)sin(theta) - b*theta') ---
  // Real initial condition is set by reset(), called from the $effect below.
  let pendState = { theta: 0, omega: 0 };
  function pendDerivative(state: { theta: number; omega: number }) {
    const alpha = -(gPend / length) * Math.sin(state.theta) - damping * state.omega;
    return { theta: state.omega, omega: alpha };
  }
  function pendStep(dt: number) {
    const s = pendState;
    const k1 = pendDerivative(s);
    const s2 = { theta: s.theta + (k1.theta * dt) / 2, omega: s.omega + (k1.omega * dt) / 2 };
    const k2 = pendDerivative(s2);
    const s3 = { theta: s.theta + (k2.theta * dt) / 2, omega: s.omega + (k2.omega * dt) / 2 };
    const k3 = pendDerivative(s3);
    const s4 = { theta: s.theta + k3.theta * dt, omega: s.omega + k3.omega * dt };
    const k4 = pendDerivative(s4);
    pendState = {
      theta: s.theta + (dt / 6) * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta),
      omega: s.omega + (dt / 6) * (k1.omega + 2 * k2.omega + 2 * k3.omega + k4.omega),
    };
  }

  // --- RC circuit ---
  function circuitVoltage(time: number): number {
    const tau = resistance * capacitance;
    if (tau <= 0) return 0;
    return charging ? voltage * (1 - Math.exp(-time / tau)) : voltage * Math.exp(-time / tau);
  }

  function tick(ts: number) {
    if (!running) return;
    const dtReal = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
    lastTs = ts;
    const dt = dtReal * speed;
    t += dt;

    let sampleValue = 0;
    if (kind === "projectile") {
      const pos = projectilePos(t);
      sampleValue = pos.y;
      if (t > projectileFlightTime() + 0.5) running = false;
    } else if (kind === "pendulum") {
      const steps = 4;
      for (let i = 0; i < steps; i++) pendStep(dt / steps);
      sampleValue = (pendState.theta * 180) / Math.PI;
    } else {
      sampleValue = circuitVoltage(t);
      if (t > resistance * capacitance * 6) running = false;
    }
    trace.push({ t, v: sampleValue });
    if (trace.length > 2000) trace.shift();

    draw();
    rafId = requestAnimationFrame(tick);
  }

  $effect(() => {
    if (running) {
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    } else if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  });

  function resizeCanvas() {
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
    ctx.clearRect(0, 0, w, h);
    const animH = h * 0.6;
    const plotH = h - animH;

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(0, animH);
    ctx.lineTo(w, animH);
    ctx.stroke();

    if (kind === "projectile") drawProjectile(ctx, w, animH);
    else if (kind === "pendulum") drawPendulum(ctx, w, animH);
    else drawCircuit(ctx, w, animH);

    drawPlot(ctx, w, animH, plotH);
  }

  function drawProjectile(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const flightTime = projectileFlightTime();
    const rad = (angleDeg * Math.PI) / 180;
    const range = v0 * Math.cos(rad) * flightTime;
    const maxHeight = h0 + (v0 * Math.sin(rad)) ** 2 / (2 * gProj);
    const scaleX = w / Math.max(range, 1) / 1.15;
    const scaleY = h / Math.max(maxHeight, h0, 1) / 1.3;
    const scale = Math.min(scaleX, scaleY);
    const toPx = (x: number, y: number) => ({ px: 20 + x * scale, py: h - 10 - y * scale });

    ctx.strokeStyle = "#89b4fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const time = (i / 100) * flightTime;
      const pos = projectilePos(time);
      const { px, py } = toPx(pos.x, pos.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const current = projectilePos(Math.min(t, flightTime));
    const { px, py } = toPx(current.x, Math.max(current.y, 0));
    ctx.fillStyle = "#f9e2af";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "12px ui-sans-serif";
    ctx.fillText(`range ≈ ${range.toFixed(2)} m, max height ≈ ${maxHeight.toFixed(2)} m, flight time ≈ ${flightTime.toFixed(2)} s`, 10, 16);
  }

  function drawPendulum(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const cx = w / 2;
    const cy = 30;
    const scale = Math.min(h - 60, w / 2) / Math.max(length, 0.1);
    const bx = cx + Math.sin(pendState.theta) * length * scale;
    const by = cy + Math.cos(pendState.theta) * length * scale;

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(bx, by);
    ctx.stroke();

    ctx.fillStyle = "#cba6f7";
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "12px ui-sans-serif";
    ctx.fillText(`θ ≈ ${((pendState.theta * 180) / Math.PI).toFixed(1)}°, ω ≈ ${pendState.omega.toFixed(2)} rad/s`, 10, 16);
  }

  function drawCircuit(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const v = circuitVoltage(t);
    const current = charging ? (voltage - v) / resistance : -v / resistance;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    const midY = h / 2;
    ctx.strokeRect(w / 2 - 60, midY - 40, 120, 80);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "12px ui-sans-serif";
    ctx.fillText("R", w / 2 - 10, midY - 50);
    ctx.fillText("C", w / 2 - 10, midY + 60);
    ctx.fillText(`V_C(t) ≈ ${v.toFixed(3)} V, I(t) ≈ ${(current * 1000).toFixed(3)} mA, τ = ${(resistance * capacitance).toFixed(4)} s`, 10, 16);
  }

  function drawPlot(ctx: CanvasRenderingContext2D, w: number, animH: number, plotH: number) {
    if (trace.length < 2) return;
    const minV = Math.min(...trace.map((p) => p.v), 0);
    const maxV = Math.max(...trace.map((p) => p.v), 0.001);
    const minT = trace[0].t;
    const maxT = Math.max(trace[trace.length - 1].t, minT + 0.001);
    ctx.strokeStyle = "#a6e3a1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    trace.forEach((p, i) => {
      const px = ((p.t - minT) / (maxT - minT)) * w;
      const py = animH + plotH - ((p.v - minV) / (maxV - minV || 1)) * (plotH - 10) - 5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

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

  $effect(() => {
    void [t, kind];
    draw();
  });

  let firstInput: HTMLInputElement | undefined = $state();
  $effect(() => {
    if (focused) queueMicrotask(() => firstInput?.focus());
  });
</script>

<div class="sim-tile">
  <div class="sidebar">
    <div class="mode-tabs">
      <button type="button" class:active={kind === "projectile"} onclick={() => (kind = "projectile")}>Projectile</button>
      <button type="button" class:active={kind === "pendulum"} onclick={() => (kind = "pendulum")}>Pendulum</button>
      <button type="button" class:active={kind === "circuit"} onclick={() => (kind = "circuit")}>RC Circuit</button>
    </div>

    {#if kind === "projectile"}
      <label>v₀ (m/s)<input bind:this={firstInput} type="number" bind:value={v0} /></label>
      <label>angle (°)<input type="number" bind:value={angleDeg} /></label>
      <label>h₀ (m)<input type="number" bind:value={h0} /></label>
      <label>g (m/s²)<input type="number" bind:value={gProj} step="0.1" /></label>
    {:else if kind === "pendulum"}
      <label>length (m)<input bind:this={firstInput} type="number" bind:value={length} step="0.1" /></label>
      <label>θ₀ (°)<input type="number" bind:value={theta0Deg} /></label>
      <label>g (m/s²)<input type="number" bind:value={gPend} step="0.1" /></label>
      <label>damping<input type="number" bind:value={damping} step="0.01" /></label>
    {:else}
      <label>V (volts)<input bind:this={firstInput} type="number" bind:value={voltage} /></label>
      <label>R (Ω)<input type="number" bind:value={resistance} /></label>
      <label>C (F)<input type="number" bind:value={capacitance} step="0.0001" /></label>
      <label class="checkbox"><input type="checkbox" bind:checked={charging} /> charging</label>
    {/if}

    <label>speed<input type="range" min="0.1" max="4" step="0.1" bind:value={speed} /> {speed}x</label>

    <div class="controls">
      <button type="button" onclick={toggleRun}>{running ? "Pause" : "Play"}</button>
      <button type="button" onclick={reset}>Reset</button>
    </div>
    <div class="t-display">t = {t.toFixed(2)} s</div>
  </div>

  <div class="canvas-host" bind:this={hostEl}>
    <canvas bind:this={canvasEl}></canvas>
  </div>
</div>

<style>
  .sim-tile {
    height: 100%;
    width: 100%;
    display: flex;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.8rem;
  }
  .sidebar {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    overflow-y: auto;
  }
  .mode-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.75rem;
    opacity: 0.85;
  }
  label.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 0.4rem;
  }
  input {
    font: inherit;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.4rem;
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
  .controls {
    display: flex;
    gap: 0.4rem;
  }
  .t-display {
    opacity: 0.6;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
  }
  .canvas-host {
    flex: 1;
    min-width: 0;
    position: relative;
  }
  canvas {
    position: absolute;
    inset: 0;
  }
</style>
