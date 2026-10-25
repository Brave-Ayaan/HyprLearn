<script lang="ts">
  import { onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { vimState } from "../../vim/stateMachine.svelte";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  interface NowPlaying {
    title: string;
    artist: string;
    status: "playing" | "paused" | "stopped" | "none" | "unsupported";
    position_secs: number;
    duration_secs: number;
    thumbnail_base64: string | null;
  }

  let nowPlaying: NowPlaying | null = $state(null);
  let error: string | null = $state(null);
  let pollId: ReturnType<typeof setInterval> | null = null;
  let tickId: ReturnType<typeof setInterval> | null = null;

  // Smoothly interpolated between polls so the progress bar doesn't jump
  // every 1.5s; resynced to the real position on every poll.
  let estimatedPosition = $state(0);
  let seeking = $state(false);

  async function poll() {
    try {
      nowPlaying = await invoke<NowPlaying>("get_now_playing");
      if (!seeking) estimatedPosition = nowPlaying.position_secs;
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  poll();
  pollId = setInterval(poll, 1500);
  tickId = setInterval(() => {
    if (nowPlaying?.status === "playing" && !seeking) {
      estimatedPosition = Math.min(estimatedPosition + 0.25, nowPlaying.duration_secs || Infinity);
    }
  }, 250);
  onDestroy(() => {
    if (pollId) clearInterval(pollId);
    if (tickId) clearInterval(tickId);
  });

  async function playPause() {
    try {
      await invoke("media_play_pause");
    } catch {
      /* no active session to control */
    }
    await poll();
  }
  async function next() {
    try {
      await invoke("media_next");
    } catch {
      /* no active session to control */
    }
    await poll();
  }
  async function previous() {
    try {
      await invoke("media_previous");
    } catch {
      /* no active session to control */
    }
    await poll();
  }

  async function onSeekInput(e: Event) {
    seeking = true;
    estimatedPosition = Number((e.target as HTMLInputElement).value);
  }
  async function onSeekCommit(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    try {
      await invoke("media_seek", { positionSecs: value });
    } catch {
      /* seeking unsupported for this session */
    }
    seeking = false;
    await poll();
  }

  function formatTime(secs: number): string {
    if (!Number.isFinite(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  let hostEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (focused) queueMicrotask(() => hostEl?.focus());
  });

  function onKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    if (e.key === "k" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      void playPause();
    } else if (e.key === "l") {
      e.preventDefault();
      e.stopPropagation();
      void next();
    } else if (e.key === "h") {
      e.preventDefault();
      e.stopPropagation();
      void previous();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="media-tile" role="application" aria-label="Now playing" bind:this={hostEl} tabindex="0" onkeydown={onKeydown}>
  {#if nowPlaying?.status === "unsupported"}
    <div class="hint">OS media-session hooks aren't implemented for this platform in this build.</div>
  {:else if nowPlaying?.status === "none" || !nowPlaying?.title}
    <div class="hint">Nothing is currently playing on this system.</div>
  {:else}
    <div class="now-playing">
      {#if nowPlaying.thumbnail_base64}
        <img class="art" src="data:image/jpeg;base64,{nowPlaying.thumbnail_base64}" alt="Album art" />
      {:else}
        <div class="art placeholder">♪</div>
      {/if}
      <div class="title">{nowPlaying.title}</div>
      <div class="artist">{nowPlaying.artist}</div>
      <div class="status">{nowPlaying.status}</div>

      {#if nowPlaying.duration_secs > 0}
        <div class="seek-row">
          <span class="time">{formatTime(estimatedPosition)}</span>
          <input
            type="range"
            min="0"
            max={nowPlaying.duration_secs}
            step="1"
            value={estimatedPosition}
            oninput={onSeekInput}
            onchange={onSeekCommit}
          />
          <span class="time">{formatTime(nowPlaying.duration_secs)}</span>
        </div>
      {/if}
    </div>
  {/if}

  <div class="controls">
    <button type="button" onclick={previous} title="Previous (h)">⏮</button>
    <button type="button" onclick={playPause} title="Play/Pause (k)">⏯</button>
    <button type="button" onclick={next} title="Next (l)">⏭</button>
  </div>

  {#if error}<div class="error">{error}</div>{/if}
  <p class="disclaimer">Reads whatever is already playing via the OS media session (SMTC on Windows) — no streaming, no accounts, no network.</p>
</div>

<style>
  .media-tile {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    padding: 1rem;
    box-sizing: border-box;
    color: var(--fg);
    font-family: "JetBrains Mono", ui-sans-serif, system-ui, sans-serif;
    font-size: 0.85rem;
    outline: none;
  }
  .hint {
    opacity: 0.55;
    text-align: center;
  }
  .now-playing {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
  }
  .art {
    width: 6rem;
    height: 6rem;
    border-radius: calc(var(--radius) - 2px);
    object-fit: cover;
    margin-bottom: 0.4rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  .art.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    font-size: 2rem;
    opacity: 0.4;
  }
  .title {
    font-size: 1.1rem;
    font-weight: 600;
  }
  .artist {
    opacity: 0.7;
  }
  .status {
    margin-top: 0.1rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
  }
  .seek-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 16rem;
    margin-top: 0.4rem;
  }
  .seek-row input[type="range"] {
    flex: 1;
  }
  .time {
    font-size: 0.68rem;
    opacity: 0.6;
    width: 2.5rem;
  }
  .controls {
    display: flex;
    gap: 0.8rem;
  }
  button {
    font-size: 1.3rem;
    padding: 0.4rem 0.8rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .error {
    color: var(--error);
    font-size: 0.75rem;
  }
  .disclaimer {
    margin: 0;
    opacity: 0.4;
    font-size: 0.68rem;
    text-align: center;
    max-width: 24rem;
  }
</style>
