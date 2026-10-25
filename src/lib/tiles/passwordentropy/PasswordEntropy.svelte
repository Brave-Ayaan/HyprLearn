<script lang="ts">
  import { vimState } from "../../vim/stateMachine.svelte";
  import { commonPasswords } from "./commonPasswords";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let password = $state("");
  let reveal = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (focused) queueMicrotask(() => inputEl?.focus());
  });

  function charsetSize(pw: string): number {
    let size = 0;
    if (/[a-z]/.test(pw)) size += 26;
    if (/[A-Z]/.test(pw)) size += 26;
    if (/[0-9]/.test(pw)) size += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) size += 33; // common printable symbols
    return size || 1;
  }

  function hasSequential(pw: string): boolean {
    const lower = pw.toLowerCase();
    const sequences = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
    for (const seq of sequences) {
      for (let i = 0; i <= seq.length - 3; i++) {
        const fwd = seq.slice(i, i + 3);
        const rev = [...fwd].reverse().join("");
        if (lower.includes(fwd) || lower.includes(rev)) return true;
      }
    }
    return false;
  }

  function hasRepeats(pw: string): boolean {
    return /(.)\1\1/.test(pw);
  }

  const analysis = $derived.by(() => {
    const pw = password;
    const size = charsetSize(pw);
    const bits = pw.length === 0 ? 0 : pw.length * Math.log2(size);
    const guesses = Math.pow(2, bits);
    const rates = [
      { label: "online, throttled (10/s)", rate: 10 },
      { label: "offline, fast hash (10⁹/s)", rate: 1e9 },
      { label: "offline, GPU cluster (10¹²/s)", rate: 1e12 },
    ];
    const crackTimes = rates.map((r) => ({ label: r.label, seconds: guesses / 2 / r.rate }));
    const warnings: string[] = [];
    if (commonPasswords.has(pw.toLowerCase())) warnings.push("This is one of the most commonly used passwords in the world.");
    if (hasSequential(pw)) warnings.push("Contains a sequential run (e.g. abc, 123, qwerty).");
    if (hasRepeats(pw)) warnings.push("Contains 3+ repeated characters in a row.");
    if (pw.length > 0 && pw.length < 8) warnings.push("Shorter than 8 characters.");
    if (pw.length > 0 && !/[A-Z]/.test(pw)) warnings.push("No uppercase letters.");
    if (pw.length > 0 && !/[0-9]/.test(pw)) warnings.push("No digits.");
    if (pw.length > 0 && !/[^a-zA-Z0-9]/.test(pw)) warnings.push("No symbols.");

    let strength: "empty" | "weak" | "fair" | "strong" | "excellent" = "empty";
    if (pw.length > 0) {
      if (bits < 28) strength = "weak";
      else if (bits < 60) strength = "fair";
      else if (bits < 100) strength = "strong";
      else strength = "excellent";
    }
    return { bits, size, crackTimes, warnings, strength };
  });

  function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) return "effectively forever";
    const units: [string, number][] = [
      ["centuries", 100 * 365.25 * 86400],
      ["years", 365.25 * 86400],
      ["days", 86400],
      ["hours", 3600],
      ["minutes", 60],
      ["seconds", 1],
    ];
    for (const [name, size] of units) {
      if (seconds >= size) return `${(seconds / size).toPrecision(3)} ${name}`;
    }
    return "< 1 second";
  }

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="pw-tile">
  <div class="input-row">
    <input
      bind:this={inputEl}
      type={reveal ? "text" : "password"}
      bind:value={password}
      onkeydown={onKeydown}
      placeholder="Type a password to analyze (never sent anywhere)"
      spellcheck="false"
      autocomplete="off"
    />
    <button type="button" onclick={() => (reveal = !reveal)}>{reveal ? "Hide" : "Show"}</button>
  </div>

  <div class="strength-bar">
    <div class="fill {analysis.strength}" style="width: {Math.min((analysis.bits / 120) * 100, 100)}%;"></div>
  </div>
  <div class="strength-label {analysis.strength}">{analysis.strength} — ≈{analysis.bits.toFixed(1)} bits of entropy (charset size {analysis.size})</div>

  <div class="crack-times">
    {#each analysis.crackTimes as c (c.label)}
      <div class="crack-row"><span class="dim">{c.label}</span><span class="mono">{formatDuration(c.seconds)}</span></div>
    {/each}
  </div>

  {#if analysis.warnings.length}
    <ul class="warnings">
      {#each analysis.warnings as w (w)}<li>{w}</li>{/each}
    </ul>
  {/if}

  <p class="disclaimer">Everything here runs locally in this window; nothing is transmitted, logged, or stored.</p>
</div>

<style>
  .pw-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.75rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
  }
  .input-row {
    display: flex;
    gap: 0.4rem;
  }
  input {
    flex: 1;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.95rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.4rem 0.6rem;
    outline: none;
  }
  input:focus {
    border-color: var(--accent);
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
  .strength-bar {
    height: 0.4rem;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    transition: width 0.15s ease;
  }
  .fill.weak {
    background: var(--error);
  }
  .fill.fair {
    background: #fab387;
  }
  .fill.strong {
    background: var(--success);
  }
  .fill.excellent {
    background: #89b4fa;
  }
  .strength-label {
    font-size: 0.78rem;
    text-transform: capitalize;
  }
  .strength-label.weak {
    color: var(--error);
  }
  .strength-label.fair {
    color: #fab387;
  }
  .strength-label.strong {
    color: var(--success);
  }
  .strength-label.excellent {
    color: #89b4fa;
  }
  .crack-times {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: calc(var(--radius) - 2px);
    padding: 0.5rem 0.6rem;
  }
  .crack-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
  }
  .dim {
    opacity: 0.6;
  }
  .mono {
    font-family: "JetBrains Mono", ui-monospace, monospace;
  }
  .warnings {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.78rem;
    color: #f9e2af;
  }
  .disclaimer {
    margin: 0;
    opacity: 0.45;
    font-size: 0.72rem;
  }
</style>
