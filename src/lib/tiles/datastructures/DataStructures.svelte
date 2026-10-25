<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Kind = "stack" | "queue" | "bst" | "graph";
  let kind: Kind = $state("stack");
  let valueInput = $state(10);
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  // --- Stack / Queue ---
  let stack: number[] = $state([5, 12, 3]);
  let queue: number[] = $state([5, 12, 3]);
  function pushStack() {
    stack.push(valueInput);
  }
  function popStack() {
    stack.pop();
  }
  function enqueue() {
    queue.push(valueInput);
  }
  function dequeue() {
    queue.shift();
  }

  // --- BST ---
  interface BstNode {
    value: number;
    left: BstNode | null;
    right: BstNode | null;
  }
  let bstRoot: BstNode | null = $state(null);
  let searchPath: number[] = $state([]);
  let searchFound: boolean | null = $state(null);

  function insertBst(node: BstNode | null, value: number): BstNode {
    if (!node) return { value, left: null, right: null };
    if (value < node.value) return { ...node, left: insertBst(node.left, value) };
    if (value > node.value) return { ...node, right: insertBst(node.right, value) };
    return node;
  }
  function removeBst(node: BstNode | null, value: number): BstNode | null {
    if (!node) return null;
    if (value < node.value) return { ...node, left: removeBst(node.left, value) };
    if (value > node.value) return { ...node, right: removeBst(node.right, value) };
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    let succ = node.right;
    while (succ.left) succ = succ.left;
    return { value: succ.value, left: node.left, right: removeBst(node.right, succ.value) };
  }
  function findPath(node: BstNode | null, value: number, path: number[] = []): { path: number[]; found: boolean } {
    if (!node) return { path, found: false };
    path.push(node.value);
    if (value === node.value) return { path, found: true };
    if (value < node.value) return findPath(node.left, value, path);
    return findPath(node.right, value, path);
  }

  function bstInsert() {
    bstRoot = insertBst(bstRoot, valueInput);
    searchPath = [];
    searchFound = null;
  }
  function bstDelete() {
    bstRoot = removeBst(bstRoot, valueInput);
    searchPath = [];
    searchFound = null;
  }
  function bstSearch() {
    const r = findPath(bstRoot, valueInput);
    searchPath = r.path;
    searchFound = r.found;
  }

  interface LayoutNode {
    value: number;
    x: number;
    y: number;
  }
  const bstLayout = $derived.by(() => {
    const nodes: LayoutNode[] = [];
    const edges: { from: LayoutNode; to: LayoutNode }[] = [];
    let counter = 0;
    function visit(node: BstNode | null, depth: number): LayoutNode | null {
      if (!node) return null;
      const left = visit(node.left, depth + 1);
      const self: LayoutNode = { value: node.value, x: counter++, y: depth };
      nodes.push(self);
      if (left) edges.push({ from: self, to: left });
      const right = visit(node.right, depth + 1);
      if (right) edges.push({ from: self, to: right });
      return self;
    }
    visit(bstRoot, 0);
    return { nodes, edges, width: Math.max(counter, 1) };
  });

  // --- Graph ---
  interface GraphNode {
    id: string;
    x: number;
    y: number;
  }
  let graphIds: string[] = $state(["A", "B", "C", "D", "E"]);
  let graphEdges: [string, string][] = $state([
    ["A", "B"],
    ["A", "C"],
    ["B", "D"],
    ["C", "D"],
    ["D", "E"],
  ]);
  let edgeFrom = $state("A");
  let edgeTo = $state("B");
  let traversalKind: "bfs" | "dfs" = $state("bfs");
  let traversalStart = $state("A");
  let traversalOrder: string[] = $state([]);
  let traversalStep = $state(0);

  const graphNodes = $derived.by((): GraphNode[] => {
    const n = graphIds.length;
    const r = 90;
    return graphIds.map((id, i) => ({
      id,
      x: 150 + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
      y: 120 + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
    }));
  });

  function adjacency(): Record<string, string[]> {
    const adj: Record<string, string[]> = {};
    for (const id of graphIds) adj[id] = [];
    for (const [a, b] of graphEdges) {
      adj[a]?.push(b);
      adj[b]?.push(a);
    }
    return adj;
  }

  function addNode() {
    const next = String.fromCharCode(65 + graphIds.length);
    graphIds.push(next);
  }
  function addEdge() {
    if (edgeFrom !== edgeTo && !graphEdges.some(([a, b]) => (a === edgeFrom && b === edgeTo) || (a === edgeTo && b === edgeFrom))) {
      graphEdges.push([edgeFrom, edgeTo]);
    }
  }
  function resetGraph() {
    graphIds = ["A", "B", "C", "D", "E"];
    graphEdges = [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "D"],
      ["D", "E"],
    ];
    traversalOrder = [];
    traversalStep = 0;
  }

  function runTraversal() {
    const adj = adjacency();
    const visited = new Set<string>();
    const order: string[] = [];
    if (traversalKind === "bfs") {
      const q = [traversalStart];
      visited.add(traversalStart);
      while (q.length) {
        const cur = q.shift()!;
        order.push(cur);
        for (const next of adj[cur] ?? []) {
          if (!visited.has(next)) {
            visited.add(next);
            q.push(next);
          }
        }
      }
    } else {
      const stackDfs = [traversalStart];
      while (stackDfs.length) {
        const cur = stackDfs.pop()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        order.push(cur);
        const next = adj[cur] ?? [];
        for (let i = next.length - 1; i >= 0; i--) if (!visited.has(next[i])) stackDfs.push(next[i]);
      }
    }
    traversalOrder = order;
    traversalStep = 0;
  }

  function stepForward() {
    if (traversalStep < traversalOrder.length) traversalStep++;
  }
  function stepBack() {
    if (traversalStep > 0) traversalStep--;
  }

  const visitedSoFar = $derived(new Set(traversalOrder.slice(0, traversalStep)));
  const currentNode = $derived(traversalStep > 0 ? traversalOrder[traversalStep - 1] : null);

  function onInputKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="ds-tile">
  <div class="mode-tabs">
    <button type="button" class:active={kind === "stack"} onclick={() => (kind = "stack")}>Stack</button>
    <button type="button" class:active={kind === "queue"} onclick={() => (kind = "queue")}>Queue</button>
    <button type="button" class:active={kind === "bst"} onclick={() => (kind = "bst")}>Tree</button>
    <button type="button" class:active={kind === "graph"} onclick={() => (kind = "graph")}>Graph</button>
  </div>

  {#if kind === "stack"}
    <div class="controls">
      <input bind:this={inputEl} type="number" bind:value={valueInput} onkeydown={onInputKeydown} />
      <button type="button" onclick={pushStack}>Push</button>
      <button type="button" onclick={popStack}>Pop</button>
    </div>
    <div class="stack-view">
      {#each [...stack].reverse() as v, i (stack.length - i)}
        <div class="box" class:top={i === 0}>{v}{#if i === 0}<span class="tag">top</span>{/if}</div>
      {/each}
      {#if stack.length === 0}<div class="dim">empty</div>{/if}
    </div>
  {:else if kind === "queue"}
    <div class="controls">
      <input bind:this={inputEl} type="number" bind:value={valueInput} onkeydown={onInputKeydown} />
      <button type="button" onclick={enqueue}>Enqueue</button>
      <button type="button" onclick={dequeue}>Dequeue</button>
    </div>
    <div class="queue-view">
      {#each queue as v, i (i)}
        <div class="box" class:front={i === 0} class:back={i === queue.length - 1}>
          {v}
          {#if i === 0}<span class="tag">front</span>{/if}
          {#if i === queue.length - 1 && queue.length > 1}<span class="tag">back</span>{/if}
        </div>
      {/each}
      {#if queue.length === 0}<div class="dim">empty</div>{/if}
    </div>
  {:else if kind === "bst"}
    <div class="controls">
      <input bind:this={inputEl} type="number" bind:value={valueInput} onkeydown={onInputKeydown} />
      <button type="button" onclick={bstInsert}>Insert</button>
      <button type="button" onclick={bstDelete}>Delete</button>
      <button type="button" onclick={bstSearch}>Search</button>
      {#if searchFound !== null}
        <span class="search-result" class:found={searchFound}>{searchFound ? "found" : "not found"}</span>
      {/if}
    </div>
    <svg class="tree-svg" viewBox="0 0 {Math.max(bstLayout.width * 60, 200)} {(Math.max(...bstLayout.nodes.map((n) => n.y), 0) + 1) * 60}">
      {#each bstLayout.edges as e, i (i)}
        <line x1={e.from.x * 60 + 30} y1={e.from.y * 60 + 25} x2={e.to.x * 60 + 30} y2={e.to.y * 60 + 25} stroke="rgba(255,255,255,0.3)" />
      {/each}
      {#each bstLayout.nodes as n (n.value)}
        <circle cx={n.x * 60 + 30} cy={n.y * 60 + 25} r="16" class:path={searchPath.includes(n.value)} />
        <text x={n.x * 60 + 30} y={n.y * 60 + 30} text-anchor="middle">{n.value}</text>
      {/each}
    </svg>
  {:else}
    <div class="controls">
      <button type="button" onclick={addNode}>+ Node</button>
      <select bind:value={edgeFrom}>{#each graphIds as g (g)}<option value={g}>{g}</option>{/each}</select>
      <select bind:value={edgeTo}>{#each graphIds as g (g)}<option value={g}>{g}</option>{/each}</select>
      <button type="button" onclick={addEdge}>+ Edge</button>
      <button type="button" onclick={resetGraph}>Reset</button>
    </div>
    <div class="controls">
      <select bind:value={traversalKind}>
        <option value="bfs">BFS</option>
        <option value="dfs">DFS</option>
      </select>
      <span>from</span>
      <select bind:value={traversalStart}>{#each graphIds as g (g)}<option value={g}>{g}</option>{/each}</select>
      <button type="button" onclick={runTraversal}>Run</button>
      <button type="button" onclick={stepBack}>◀ step</button>
      <button type="button" onclick={stepForward}>step ▶</button>
      <span class="dim">{traversalStep}/{traversalOrder.length} — order: {traversalOrder.join(", ")}</span>
    </div>
    <svg class="graph-svg" viewBox="0 0 300 240">
      {#each graphEdges as [a, b], i (i)}
        {@const na = graphNodes.find((n) => n.id === a)}
        {@const nb = graphNodes.find((n) => n.id === b)}
        {#if na && nb}
          <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(255,255,255,0.3)" />
        {/if}
      {/each}
      {#each graphNodes as n (n.id)}
        <circle cx={n.x} cy={n.y} r="16" class:visited={visitedSoFar.has(n.id)} class:current={currentNode === n.id} />
        <text x={n.x} y={n.y + 5} text-anchor="middle">{n.id}</text>
      {/each}
    </svg>
  {/if}
</div>

<style>
  .ds-tile {
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
  .mode-tabs,
  .controls {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: center;
  }
  button,
  select {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.25rem 0.55rem;
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
  input {
    width: 4.5rem;
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.2rem 0.4rem;
  }
  .stack-view {
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: 0.2rem;
  }
  .queue-view {
    display: flex;
    gap: 0.3rem;
  }
  .box {
    position: relative;
    background: rgba(255, 255, 255, 0.06);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.35rem 0.8rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .box.top,
  .box.front {
    outline: 1px solid var(--accent);
  }
  .tag {
    position: absolute;
    top: -0.9rem;
    left: 0;
    font-size: 0.6rem;
    opacity: 0.6;
  }
  .dim {
    opacity: 0.5;
    font-size: 0.78rem;
  }
  .search-result {
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    background: rgba(243, 139, 168, 0.2);
    color: var(--error);
  }
  .search-result.found {
    background: rgba(166, 227, 161, 0.2);
    color: var(--success);
  }
  .tree-svg,
  .graph-svg {
    width: 100%;
    flex: 1;
  }
  circle {
    fill: rgba(255, 255, 255, 0.06);
    stroke: rgba(255, 255, 255, 0.3);
  }
  circle.path,
  circle.visited {
    fill: rgba(203, 166, 247, 0.3);
    stroke: var(--accent);
  }
  circle.current {
    fill: var(--accent);
    stroke: var(--accent);
  }
  text {
    fill: var(--fg);
    font-size: 11px;
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
</style>
