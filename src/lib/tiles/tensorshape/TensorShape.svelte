<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type LayerType = "conv2d" | "maxpool2d" | "flatten" | "linear" | "relu";
  interface Layer {
    id: number;
    type: LayerType;
    outChannels?: number;
    kernel?: number;
    stride?: number;
    padding?: number;
    outFeatures?: number;
  }

  let nextId = 1;
  let n = $state(1);
  let c = $state(3);
  let h = $state(224);
  let w = $state(224);

  let layers: Layer[] = $state([
    { id: nextId++, type: "conv2d", outChannels: 16, kernel: 3, stride: 1, padding: 1 },
    { id: nextId++, type: "relu" },
    { id: nextId++, type: "maxpool2d", kernel: 2, stride: 2, padding: 0 },
    { id: nextId++, type: "flatten" },
    { id: nextId++, type: "linear", outFeatures: 10 },
  ]);

  function addLayer(type: LayerType) {
    const base: Layer = { id: nextId++, type };
    if (type === "conv2d") Object.assign(base, { outChannels: 16, kernel: 3, stride: 1, padding: 1 });
    if (type === "maxpool2d") Object.assign(base, { kernel: 2, stride: 2, padding: 0 });
    if (type === "linear") Object.assign(base, { outFeatures: 10 });
    layers.push(base);
  }
  function removeLayer(lid: number) {
    layers = layers.filter((l) => l.id !== lid);
  }

  interface Shape {
    n: number;
    c: number;
    h: number | null;
    w: number | null;
  }
  interface StepResult {
    layer: Layer;
    shapeBefore: Shape;
    shapeAfter: Shape;
    params: number;
    error: string | null;
  }

  function convOut(size: number, kernel: number, stride: number, padding: number): number {
    return Math.floor((size + 2 * padding - kernel) / stride + 1);
  }

  const steps = $derived.by((): StepResult[] => {
    let shape: Shape = { n, c, h, w };
    const out: StepResult[] = [];
    for (const layer of layers) {
      const before = { ...shape };
      let after = { ...shape };
      let params = 0;
      let error: string | null = null;
      try {
        if (layer.type === "conv2d") {
          if (shape.h === null || shape.w === null) throw new Error("Conv2d needs a spatial (H,W) input");
          const k = layer.kernel ?? 3;
          const s = layer.stride ?? 1;
          const p = layer.padding ?? 0;
          const outC = layer.outChannels ?? 1;
          after = { n: shape.n, c: outC, h: convOut(shape.h, k, s, p), w: convOut(shape.w, k, s, p) };
          params = shape.c * outC * k * k + outC;
        } else if (layer.type === "maxpool2d") {
          if (shape.h === null || shape.w === null) throw new Error("Pooling needs a spatial (H,W) input");
          const k = layer.kernel ?? 2;
          const s = layer.stride ?? k;
          const p = layer.padding ?? 0;
          after = { n: shape.n, c: shape.c, h: convOut(shape.h, k, s, p), w: convOut(shape.w, k, s, p) };
        } else if (layer.type === "flatten") {
          const flat = shape.c * (shape.h ?? 1) * (shape.w ?? 1);
          after = { n: shape.n, c: flat, h: null, w: null };
        } else if (layer.type === "linear") {
          const outF = layer.outFeatures ?? 1;
          const inF = shape.h !== null || shape.w !== null ? shape.c * (shape.h ?? 1) * (shape.w ?? 1) : shape.c;
          params = inF * outF + outF;
          after = { n: shape.n, c: outF, h: null, w: null };
        } else {
          after = { ...shape };
        }
      } catch (err) {
        error = err instanceof Error ? err.message : "Error";
      }
      out.push({ layer, shapeBefore: before, shapeAfter: after, params, error });
      if (!error) shape = after;
    }
    return out;
  });

  const totalParams = $derived(steps.reduce((sum, s) => sum + s.params, 0));

  function shapeStr(s: Shape): string {
    const parts = [s.n, s.c, s.h, s.w].filter((v) => v !== null);
    return `(${parts.join(", ")})`;
  }

  let firstInput: HTMLInputElement | undefined = $state();
  $effect(() => {
    if (focused) queueMicrotask(() => firstInput?.focus());
  });
</script>

<div class="tensor-tile">
  <div class="sidebar">
    <h3>Input</h3>
    <div class="input-row">
      <label>N<input bind:this={firstInput} type="number" bind:value={n} /></label>
      <label>C<input type="number" bind:value={c} /></label>
      <label>H<input type="number" bind:value={h} /></label>
      <label>W<input type="number" bind:value={w} /></label>
    </div>
    <h3>Add layer</h3>
    <div class="add-buttons">
      <button type="button" onclick={() => addLayer("conv2d")}>Conv2d</button>
      <button type="button" onclick={() => addLayer("maxpool2d")}>MaxPool2d</button>
      <button type="button" onclick={() => addLayer("relu")}>ReLU</button>
      <button type="button" onclick={() => addLayer("flatten")}>Flatten</button>
      <button type="button" onclick={() => addLayer("linear")}>Linear</button>
    </div>
    <div class="total">Total params: {totalParams.toLocaleString()}</div>
  </div>

  <div class="steps">
    {#each steps as s, i (s.layer.id)}
      <div class="step" class:error={!!s.error}>
        <div class="step-head">
          <span class="step-idx">{i + 1}</span>
          <span class="step-type">{s.layer.type}</span>
          {#if s.layer.type === "conv2d"}
            <input class="small" type="number" bind:value={s.layer.outChannels} title="out channels" />
            <input class="small" type="number" bind:value={s.layer.kernel} title="kernel" />
            <input class="small" type="number" bind:value={s.layer.stride} title="stride" />
            <input class="small" type="number" bind:value={s.layer.padding} title="padding" />
          {:else if s.layer.type === "maxpool2d"}
            <input class="small" type="number" bind:value={s.layer.kernel} title="kernel" />
            <input class="small" type="number" bind:value={s.layer.stride} title="stride" />
            <input class="small" type="number" bind:value={s.layer.padding} title="padding" />
          {:else if s.layer.type === "linear"}
            <input class="small" type="number" bind:value={s.layer.outFeatures} title="out features" />
          {/if}
          <button type="button" class="danger" onclick={() => removeLayer(s.layer.id)}>×</button>
        </div>
        {#if s.error}
          <div class="step-error">{s.error}</div>
        {:else}
          <div class="step-shapes">
            <span class="mono">{shapeStr(s.shapeBefore)}</span>
            <span class="arrow">→</span>
            <span class="mono">{shapeStr(s.shapeAfter)}</span>
            {#if s.params > 0}<span class="dim">{s.params.toLocaleString()} params</span>{/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .tensor-tile {
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
  h3 {
    margin: 0;
    font-size: 0.78rem;
    opacity: 0.6;
  }
  .input-row {
    display: flex;
    gap: 0.3rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.7rem;
    opacity: 0.8;
  }
  input {
    font: inherit;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.3rem;
    width: 3.2rem;
  }
  input.small {
    width: 2.6rem;
  }
  .add-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
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
  button.danger {
    border-color: rgba(243, 139, 168, 0.4);
    color: var(--error);
    margin-left: auto;
  }
  .total {
    margin-top: auto;
    font-size: 0.75rem;
    opacity: 0.75;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .steps {
    flex: 1;
    overflow-y: auto;
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .step {
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.4rem 0.6rem;
  }
  .step.error {
    outline: 1px solid var(--error);
  }
  .step-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.25rem;
  }
  .step-idx {
    opacity: 0.4;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.7rem;
  }
  .step-type {
    font-weight: 600;
  }
  .step-shapes {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    font-size: 0.8rem;
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .arrow {
    opacity: 0.5;
  }
  .dim {
    opacity: 0.55;
    font-size: 0.72rem;
  }
  .step-error {
    color: var(--error);
    font-size: 0.78rem;
  }
</style>
