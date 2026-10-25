<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { vimState } from "../../vim/stateMachine.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  type Phase = "focus" | "short_break" | "long_break";

  let focusMin = $state(25);
  let shortBreakMin = $state(5);
  let longBreakMin = $state(15);
  let sessionsBeforeLong = $state(4);

  let phase: Phase = $state("focus");
  let remainingSecs = $state(25 * 60); // matches the default focusMin above
  let running = $state(false);
  let completedInCycle = $state(0);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  interface Stats {
    today_focus_count: number;
    today_focus_secs: number;
    total_focus_count: number;
    total_focus_secs: number;
  }
  let stats: Stats | null = $state(null);

  async function refreshStats() {
    stats = await invoke<Stats>("pomodoro_stats");
  }
  refreshStats();

  function phaseLength(p: Phase): number {
    if (p === "focus") return focusMin * 60;
    if (p === "short_break") return shortBreakMin * 60;
    return longBreakMin * 60;
  }

  function resetTimer() {
    running = false;
    if (intervalId) clearInterval(intervalId);
    remainingSecs = phaseLength(phase);
  }

  async function advancePhase() {
    if (phase === "focus") {
      await invoke("log_pomodoro_session", { kind: "focus", durationSecs: focusMin * 60 });
      completedInCycle++;
      phase = completedInCycle % sessionsBeforeLong === 0 ? "long_break" : "short_break";
    } else {
      await invoke("log_pomodoro_session", { kind: phase, durationSecs: phaseLength(phase) });
      phase = "focus";
    }
    remainingSecs = phaseLength(phase);
    await refreshStats();
  }

  function toggleRun() {
    running = !running;
    if (running) {
      intervalId = setInterval(() => {
        remainingSecs--;
        if (remainingSecs <= 0) {
          void advancePhase();
        }
      }, 1000);
    } else if (intervalId) {
      clearInterval(intervalId);
    }
  }

  $effect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });

  function formatTime(secs: number): string {
    const m = Math.max(0, Math.floor(secs / 60));
    const s = Math.max(0, secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function formatHours(secs: number): string {
    return (secs / 3600).toFixed(1);
  }

  const phaseLabel = $derived(phase === "focus" ? "Focus" : phase === "short_break" ? "Short break" : "Long break");

  let hostEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (focused) queueMicrotask(() => hostEl?.focus());
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    if (e.key === "p" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      toggleRun();
    } else if (e.key === "r") {
      e.preventDefault();
      e.stopPropagation();
      resetTimer();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="pomo-tile" role="application" aria-label="Pomodoro timer" bind:this={hostEl} tabindex="0" onkeydown={onKeydown}>
  <div class="phase-label {phase}">{phaseLabel}</div>
  <div class="timer">{formatTime(remainingSecs)}</div>
  <div class="controls">
    <button type="button" onclick={toggleRun}>{running ? "Pause" : "Start"} (p)</button>
    <button type="button" onclick={resetTimer}>Reset (r)</button>
  </div>
  <div class="cycle-dots">
    {#each Array(sessionsBeforeLong) as _, i (i)}
      <span class="dot" class:filled={i < completedInCycle % sessionsBeforeLong || (completedInCycle > 0 && completedInCycle % sessionsBeforeLong === 0 && i < sessionsBeforeLong)}></span>
    {/each}
  </div>

  <div class="settings">
    <label>focus (min)<input type="number" bind:value={focusMin} onchange={resetTimer} /></label>
    <label>short break<input type="number" bind:value={shortBreakMin} /></label>
    <label>long break<input type="number" bind:value={longBreakMin} /></label>
    <label>sessions/cycle<input type="number" bind:value={sessionsBeforeLong} /></label>
  </div>

  {#if stats}
    <div class="stats">
      <div>Today: {stats.today_focus_count} sessions, {formatHours(stats.today_focus_secs)}h focused</div>
      <div class="dim">All time: {stats.total_focus_count} sessions, {formatHours(stats.total_focus_secs)}h focused</div>
    </div>
  {/if}
</div>

<style>
  .pomo-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    padding: 1rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
    outline: none;
  }
  .phase-label {
    font-size: 0.9rem;
    opacity: 0.7;
  }
  .phase-label.focus {
    color: var(--accent);
  }
  .timer {
    font-size: 3rem;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-weight: 700;
  }
  .controls {
    display: flex;
    gap: 0.5rem;
  }
  button {
    font: inherit;
    font-size: 0.78rem;
    padding: 0.3rem 0.7rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .cycle-dots {
    display: flex;
    gap: 0.3rem;
  }
  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
  }
  .dot.filled {
    background: var(--accent);
  }
  .settings {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 0.5rem;
  }
  .settings label {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.68rem;
    opacity: 0.7;
  }
  .settings input {
    width: 3.5rem;
    font: inherit;
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.15rem 0.3rem;
  }
  .stats {
    margin-top: 0.6rem;
    text-align: center;
    font-size: 0.75rem;
  }
  .dim {
    opacity: 0.55;
  }
</style>
