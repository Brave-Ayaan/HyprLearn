<script lang="ts">
  import { configStore } from "../../config/store.svelte";
  import { tileCatalog } from "../../tiles/catalog";
  import { vimState } from "../../vim/stateMachine.svelte";
  import { actionRegistry } from "../../actions/registry";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let hostEl: HTMLDivElement | undefined = $state();
  let query = $state("");
  let commandQuery = $state("");

  configStore.init();

  $effect(() => {
    if (focused) queueMicrotask(() => hostEl?.focus());
  });

  // Built live from the actual config, so this table can never drift out of
  // sync with your real keybindings - it reads them, it doesn't guess them.
  const openShortcuts = $derived.by(() => {
    const leader = configStore.config?.keybindings.leader ?? {};
    const labelByType = new Map(tileCatalog.map((t) => [t.type, t.label]));
    const rows: { key: string; label: string }[] = [];
    for (const [key, action] of Object.entries(leader)) {
      const m = /^o (.)$/.exec(key);
      const m2 = /^tile\.open\.(.+)$/.exec(action);
      if (m && m2) {
        rows.push({ key: m[1], label: labelByType.get(m2[1]) ?? m2[1] });
      }
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label));
  });

  const filteredShortcuts = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return openShortcuts;
    return openShortcuts.filter((r) => r.label.toLowerCase().includes(q) || r.key.toLowerCase() === q);
  });

  function formatLeaderKeys(keys: string[]): string[] {
    const digits = "123456789".split("");
    if (digits.every((d) => keys.includes(d)) && keys.length === digits.length) return ["1-9"];
    return keys;
  }

  // Every action, cross-referenced against the live config so each row shows
  // exactly how to trigger it - but every row works via ":<name or words
  // from the description>" regardless, since that's the fuzzy resolver's
  // fallback for anything without a dedicated key.
  const allCommands = $derived.by(() => {
    const leader = configStore.config?.keybindings.leader ?? {};
    const normal = configStore.config?.keybindings.normal ?? {};
    const global = configStore.config?.keybindings.global ?? {};
    const command = configStore.config?.keybindings.command ?? {};

    function keysFor(map: Record<string, string>, actionName: string): string[] {
      return Object.entries(map)
        .filter(([, action]) => action === actionName || action.startsWith(`${actionName}:`))
        .map(([key]) => key);
    }

    return Array.from(actionRegistry.values())
      .map((def) => ({
        name: def.name,
        description: def.description,
        leader: formatLeaderKeys(keysFor(leader, def.name)),
        normal: keysFor(normal, def.name),
        global: keysFor(global, def.name),
        aliases: keysFor(command, def.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const filteredCommands = $derived.by(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="hyprlearn-tile" bind:this={hostEl} tabindex="0" onkeydown={onKeydown}>
  <header>
    <h1>HyprLearn</h1>
    <p class="tagline">
      Hyprland + Learn - a vim-modal, tiling STEM workbench, {tileCatalog.length} tiles and counting. Everything below
      is also true right now, in this window.
    </p>
  </header>

  <section>
    <h2>1. The core model</h2>
    <p>
      The whole window is tiled into panels ("tiles"), the way a tiling window manager works - not overlapping app
      windows. A system bar across the top (CPU/RAM, and every tile currently open - click one to jump to it) is
      always visible regardless of layout. Underneath it all sits a vim-style modal input system, independent of
      whatever tool is open in a tile.
    </p>
    <table>
      <thead><tr><th>Mode</th><th>Meaning</th><th>How you get there</th></tr></thead>
      <tbody>
        <tr><td>Normal</td><td>Default. A few WM shortcuts are reserved; everything else passes through.</td><td><code>Escape</code>, or the starting state</td></tr>
        <tr><td>Insert</td><td>Typing into a field.</td><td>Click/Tab into any field - automatic, no mode switch needed</td></tr>
        <tr><td>Leader</td><td>Mid a WM command, waiting for the next key.</td><td><code>Ctrl+Space</code></td></tr>
        <tr><td>Command</td><td>Typing an ex-command after <code>:</code>.</td><td><code>:</code></td></tr>
      </tbody>
    </table>
    <p class="note">
      The status bar at the bottom always shows the current mode and any pending leader keys.
    </p>
  </section>

  <section>
    <h2>2. The leader key is persistent</h2>
    <p>
      The leader is <strong>Ctrl+Space</strong> (not bare Space - that's reserved for real vim motions inside tiles
      like Notes, e.g. Space moves the cursor right there, same as real vim).
    </p>
    <p>
      Once you press the leader, <strong>it waits forever</strong> for the next valid key - there is no timeout.
      Press Ctrl+Space, walk away for an hour, come back and press <code>o</code>, walk away again, then press
      <code>c</code> - Calculator still opens. Only <code>Escape</code> cancels a pending leader chord.
    </p>
  </section>

  <section>
    <h2>3. Moving around and typing</h2>
    <ul>
      <li>Click or Tab into any tile or field, then just type - fields auto-focus, no mode switch required.</li>
      <li><code>Escape</code> backs out of whatever field you're in.</li>
      <li><strong><code>Ctrl+K</code></strong> anywhere opens a fuzzy command palette - type part of anything (an action or a tile name) and press Enter.</li>
      <li><strong>Everything in that palette is also a <code>:</code> command</strong> - press <code>:</code>, type the same text, press Enter. You never strictly need to open the palette if you'd rather type <code>:</code> commands; both search the exact same list.</li>
    </ul>
  </section>

  <section>
    <h2>4. Managing tiles</h2>
    <p>Everything tile-related lives under the leader - press <code>Ctrl+Space</code>, then:</p>
    <table>
      <thead><tr><th>Keys</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td><code>h</code> <code>j</code> <code>k</code> <code>l</code></td><td>Move focus left / down / up / right</td></tr>
        <tr><td><code>H</code> <code>J</code> <code>K</code> <code>L</code></td><td>Swap the focused tile with its neighbor</td></tr>
        <tr><td><code>s</code> / <code>S</code></td><td>Split right / split down</td></tr>
        <tr><td><code>x</code></td><td>Close the focused tile</td></tr>
        <tr><td><code>f</code></td><td>Toggle fullscreen</td></tr>
        <tr><td><code>b</code> / <code>m</code> / <code>g</code></td><td>Layout mode: BSP / Master-Stack / Grid</td></tr>
        <tr><td><code>1</code>-<code>9</code></td><td>Jump to tile number N</td></tr>
        <tr><td><code>o</code> then a letter</td><td>Open a specific tile (table below)</td></tr>
      </tbody>
    </table>
    <p class="note">
      Splitting (<code>s</code>/<code>S</code>, or opening a new tile) rebalances the whole layout so every tile
      ends up exactly equal in area - not just a 50/50 split of the one you had focused. This works out evenly for
      any tile count, even odd ones. Shrink a tile past the point where its own UI could still render sensibly and
      it shows a plain "too small to render" message instead of garbled content - the tile underneath keeps its
      state the whole time, so resizing back up picks up exactly where you left off.
    </p>
    <p>Outside the leader, in plain Normal mode:</p>
    <table>
      <thead><tr><th>Key</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td><code>Ctrl+h/j/k/l</code></td><td>Resize the focused tile</td></tr>
        <tr><td><code>+</code> / <code>-</code></td><td>Resize (grow/shrink)</td></tr>
        <tr><td><code>Tab</code> / <code>Shift+Tab</code></td><td>Cycle focus next/previous</td></tr>
      </tbody>
    </table>
  </section>

  <section>
    <h2>5. Open any tile</h2>
    <p>
      Fastest: <strong><code>Ctrl+K</code></strong> (or <code>:</code>) then type the tile's name. Works for every
      tile, always, no memorizing required. Quick letter shortcuts also exist under <code>Ctrl+Space</code> then
      <code>o</code> - this list is read live from your actual config, so it's always accurate:
    </p>
    <input class="filter" placeholder="Filter..." bind:value={query} onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
    <table>
      <thead><tr><th>Key (after "o")</th><th>Opens</th></tr></thead>
      <tbody>
        {#each filteredShortcuts as row (row.key + row.label)}
          <tr><td><code>{row.key}</code></td><td>{row.label}</td></tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section class="wide">
    <h2>6. Every command</h2>
    <p>
      The full action registry - everything the WM, the palette, and <code>:</code> commands can do, in one table.
      <strong>Every single one works by typing <code>:</code> then any part of its name or description</strong>
      (fuzzy-matched, same as the palette) even when it has no dedicated key below - the columns just show the
      shortcuts that also exist. "Leader" means press <code>Ctrl+Space</code> first, then the listed key(s).
    </p>
    <input
      class="filter"
      placeholder="Filter commands..."
      bind:value={commandQuery}
      onfocus={() => vimState.enterInsert()}
      onblur={() => vimState.enterNormal()}
    />
    <table>
      <thead>
        <tr><th>Command</th><th>Does</th><th>Leader</th><th>Normal-mode key</th><th>Global key</th><th>:alias</th></tr>
      </thead>
      <tbody>
        {#each filteredCommands as c (c.name)}
          <tr>
            <td><code>:{c.name}</code></td>
            <td>{c.description}</td>
            <td><span class="keys">{#each c.leader as k (k)}<code>{k}</code>{:else}-{/each}</span></td>
            <td><span class="keys">{#each c.normal as k (k)}<code>{k}</code>{:else}-{/each}</span></td>
            <td><span class="keys">{#each c.global as k (k)}<code>{k}</code>{:else}-{/each}</span></td>
            <td><span class="keys">{#each c.aliases as k (k)}<code>:{k}</code>{:else}-{/each}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section>
    <h2>7. Using the tiles themselves</h2>
    <ul>
      <li><strong>Lists</strong> (Tasks, Flashcards, reference browsers): <code>j</code>/<code>k</code> move the selection; each tile shows its own extra action keys in a hint line.</li>
      <li><strong>Reference tiles</strong> (constants, formulas, cheat sheets, glossaries): search box + category chips on the left, detail on the right.</li>
      <li><strong>Notes, Scratchpad, and Code Runner</strong> embed a real vim editor (CodeMirror + actual vim keybindings, pastel syntax highlighting) - full Normal/Insert/Visual semantics, exactly like real vim/nvim. Ctrl+Space and Ctrl+K still reach the WM/palette from inside them.</li>
      <li><strong>Code Runner</strong> compiles and runs real C/C++ with gcc/g++ (needs either on your PATH) under a hard timeout, so an infinite loop can't hang anything.</li>
      <li><strong>Physics Sandbox</strong>: click empty space to drop a ball, drag before releasing to fling it slingshot-style - real gravity, drag, wall bounces, and elastic ball-ball collisions.</li>
      <li><strong>Calculator, Graphing, CAS, Matrix, etc.</strong> are click-and-type forms with live-updating results.</li>
      <li><strong>Now Playing</strong> shows album art and lets you seek, in addition to play/pause/next/previous - it drives whatever's actually playing on Windows (Spotify, browser tabs, anything with media controls), not a separate player.</li>
      <li><strong>Periodic Table</strong>, <strong>Conway's Game of Life</strong>, and <strong>Probability/Dice Simulator</strong> are click-to-explore sandboxes: search/click an element for its stats, click-drag to paint cells then Play, or roll dice and watch the observed histogram converge on the theoretical one.</li>
      <li><strong>Vault</strong> is an Obsidian-style file tree for any plain-text file (code, markdown, html, config, whatever extension you give it - not audio/video/images). Create and rename files and folders from the sidebar; it opens real files with the same vim editor and pastel highlighting as Notes/Scratchpad. It never autosaves - <code>:save</code>, the leader's <code>w</code>, or the palette's "Save file to Vault" writes the open file to disk; until then it only lives in the editor buffer, shown by the dirty dot next to the filename. Switching files or closing the tile with unsaved changes always asks first - it never discards silently. It also snapshots the unsaved buffer to a separate draft file every couple of seconds, purely for crash recovery - reopening a file after a crash or force-quit offers that draft back; it's never a substitute for actually saving.</li>
      <li><strong>JWT Inspector</strong> decodes a token's header and payload locally and can verify an HS256/384/512 signature against a secret you type in, using the browser's own Web Crypto API - no network call, no server.</li>
      <li><strong>Classical Ciphers</strong> covers Vigenere, Atbash, and Rail Fence encode/decode (the Encoding Toolkit already covers Base64/URL/Hex/Caesar/XOR, so these fill in the rest of the usual crypto-fundamentals set).</li>
      <li><strong>Gradient Descent Playground</strong> fits a line to scattered points live, one gradient step at a time - watch the loss curve and the fit line move together, and crank the learning rate up to see it diverge instead of converge.</li>
    </ul>
  </section>

  <section>
    <h2>8. Customizing</h2>
    <p>
      Open <strong>Settings</strong> (<code>Ctrl+K</code> -> "Settings"): Appearance (pick a bundled theme preset -
      One Dark Pro, Catppuccin Mocha, Nord, Gruvbox Dark - or tune every color token individually), Layout (gaps,
      border width, leader key), Folders (point Notes and the Vault at any folder on disk, with a native "Browse..."
      picker for each), and a raw Keybindings editor - the whole config as text, validated before saving so a typo
      is rejected rather than corrupting it, with keybinding changes applying immediately, no restart. The whole
      app renders in JetBrains Mono.
    </p>
    <p>The underlying file is a plain TOML dotfile; you can edit it directly too, same as any vim/tmux config.</p>
  </section>

  <section>
    <h2>9. Everything is local</h2>
    <p>
      No network calls anywhere in this app. Tasks, flashcards, pomodoro history, calendar, config.toml, and
      layout.json all live right inside the project folder itself, under its own <code>config/</code> subfolder -
      not tucked away in the OS app-data directory - so the whole app's state is visible and portable in one place.
      Notes and the Vault's files work the same way (Vault defaults to a <code>vault/</code> folder next to it). The
      JWT Inspector's signature check runs through the browser's own Web Crypto API, still entirely in this
      process. The hash calculator, tokenizer, CAS, physics engine, and everything
      else run entirely in this process. The one exception: Code Runner shells out to your own local gcc/g++ to
      compile and run C/C++ - still nothing leaves your machine, it's just a separate local process instead of
      in-process JavaScript.
    </p>
  </section>
</div>

<style>
  .hyprlearn-tile {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    padding: 1.25rem 1.5rem 3rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.88rem;
    line-height: 1.6;
    outline: none;
  }
  header {
    margin-bottom: 1.5rem;
  }
  h1 {
    margin: 0 0 0.3rem;
    font-size: 1.6rem;
    color: var(--accent);
  }
  .tagline {
    opacity: 0.65;
    margin: 0;
  }
  section {
    max-width: 48rem;
    margin-bottom: 1.75rem;
  }
  section.wide {
    max-width: 70rem;
  }
  .keys {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    opacity: 0.85;
  }
  h2 {
    font-size: 1rem;
    margin: 0 0 0.6rem;
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    padding-bottom: 0.3rem;
  }
  p {
    margin: 0 0 0.6rem;
  }
  .note {
    opacity: 0.6;
    font-size: 0.82rem;
  }
  ul {
    margin: 0;
    padding-left: 1.3rem;
  }
  li {
    margin-bottom: 0.4rem;
  }
  code {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    background: rgba(255, 255, 255, 0.08);
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
    font-size: 0.85em;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0 1rem;
    font-size: 0.85rem;
  }
  th {
    text-align: left;
    opacity: 0.6;
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  }
  td {
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .filter {
    font: inherit;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.3rem 0.5rem;
    margin-bottom: 0.4rem;
    width: 12rem;
  }
</style>
