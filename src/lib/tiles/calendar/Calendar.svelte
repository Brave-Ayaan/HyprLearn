<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { vimState } from "../../vim/stateMachine.svelte";
  import { exportIcs, parseIcs, type CalEvent } from "./ics";

  let { id, tileType, focused }: { id: number; tileType: string; focused: boolean } = $props();

  let events: CalEvent[] = $state([]);
  let adding = $state(false);
  let newTitle = $state("");
  let newDate = $state(new Date().toISOString().slice(0, 10));
  let newStartTime = $state("09:00");
  let newEndTime = $state("10:00");
  let newAllDay = $state(false);
  let newDescription = $state("");
  let titleInput: HTMLInputElement | undefined = $state();

  let showTransfer = $state(false);
  let transferText = $state("");
  let importMessage = $state("");

  async function refresh() {
    events = await invoke<CalEvent[]>("list_events");
  }
  refresh();

  $effect(() => {
    if (focused) queueMicrotask(() => titleInput?.focus());
  });

  function startAdd() {
    adding = true;
    newTitle = "";
    newDescription = "";
    queueMicrotask(() => titleInput?.focus());
  }

  function toEpoch(date: string, time: string): number {
    return Math.floor(new Date(`${date}T${time}:00`).getTime() / 1000);
  }

  async function confirmAdd() {
    if (!newTitle.trim()) return;
    const start = newAllDay ? Math.floor(new Date(`${newDate}T00:00:00`).getTime() / 1000) : toEpoch(newDate, newStartTime);
    const end = newAllDay ? start + 86400 : toEpoch(newDate, newEndTime);
    await invoke("add_event", {
      event: { title: newTitle.trim(), start_secs: start, end_secs: end, all_day: newAllDay, description: newDescription },
    });
    adding = false;
    await refresh();
  }

  async function remove(eid: number) {
    await invoke("delete_event", { id: eid });
    await refresh();
  }

  function doExport() {
    transferText = exportIcs(events);
    showTransfer = true;
    importMessage = "";
  }

  async function doImport() {
    try {
      const parsed = parseIcs(transferText);
      for (const p of parsed) {
        await invoke("add_event", { event: p });
      }
      await refresh();
      importMessage = `Imported ${parsed.length} event${parsed.length === 1 ? "" : "s"}.`;
    } catch (err) {
      importMessage = err instanceof Error ? err.message : "Failed to parse ICS text";
    }
  }

  const grouped = $derived.by(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const day = new Date(e.start_secs * 1000).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return [...map.entries()];
  });

  function formatTime(secs: number): string {
    return new Date(secs * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function onInputKeydown(e: KeyboardEvent) {
    if (vimState.mode === "Leader" || vimState.mode === "Command") return;
    if (e.key === "Escape" || e.ctrlKey || e.metaKey || e.altKey || e.key === " ") return;
    e.stopPropagation();
  }
</script>

<div class="cal-tile">
  <div class="toolbar">
    <button type="button" onclick={startAdd}>+ New event</button>
    <button type="button" onclick={() => (showTransfer = !showTransfer)}>Import / Export (.ics)</button>
  </div>

  {#if adding}
    <div class="add-form">
      <input bind:this={titleInput} bind:value={newTitle} onkeydown={onInputKeydown} placeholder="Title" onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
      <input type="date" bind:value={newDate} />
      <label class="checkbox"><input type="checkbox" bind:checked={newAllDay} /> all day</label>
      {#if !newAllDay}
        <input type="time" bind:value={newStartTime} />
        <span>–</span>
        <input type="time" bind:value={newEndTime} />
      {/if}
      <input bind:value={newDescription} onkeydown={onInputKeydown} placeholder="Description (optional)" onfocus={() => vimState.enterInsert()} onblur={() => vimState.enterNormal()} />
      <button type="button" onclick={confirmAdd}>Create</button>
      <button type="button" onclick={() => (adding = false)}>Cancel</button>
    </div>
  {/if}

  {#if showTransfer}
    <div class="transfer">
      <div class="transfer-row">
        <button type="button" onclick={doExport}>Export all to .ics text</button>
        <button type="button" onclick={doImport}>Import from .ics text below</button>
      </div>
      <textarea
        bind:value={transferText}
        onkeydown={onInputKeydown}
        onfocus={() => vimState.enterInsert()}
        onblur={() => vimState.enterNormal()}
        placeholder="Paste .ics content here to import, or Export above to fill this with your events (then copy it out to a file)."
        spellcheck="false"
      ></textarea>
      {#if importMessage}<div class="import-msg">{importMessage}</div>{/if}
    </div>
  {/if}

  <div class="agenda">
    {#each grouped as [day, items] (day)}
      <div class="day-group">
        <div class="day-label">{day}</div>
        {#each items as ev (ev.id)}
          <div class="event">
            <span class="time">{ev.all_day ? "all day" : formatTime(ev.start_secs)}</span>
            <span class="ev-title">{ev.title}</span>
            {#if ev.description}<span class="dim">{ev.description}</span>{/if}
            <button type="button" class="danger" onclick={() => remove(ev.id)}>×</button>
          </div>
        {/each}
      </div>
    {/each}
    {#if events.length === 0}<div class="empty">No events yet.</div>{/if}
  </div>
</div>

<style>
  .cal-tile {
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
  }
  .toolbar {
    display: flex;
    gap: 0.4rem;
  }
  button {
    font: inherit;
    font-size: 0.75rem;
    padding: 0.28rem 0.55rem;
    border-radius: calc(var(--radius) - 2px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    color: var(--fg);
    cursor: pointer;
  }
  .add-form,
  .transfer-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .add-form input {
    font: inherit;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.25rem 0.5rem;
  }
  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
  }
  .transfer {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .transfer textarea {
    height: 5rem;
    resize: vertical;
    font: inherit;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: calc(var(--radius) - 2px);
    color: var(--fg);
    padding: 0.4rem 0.5rem;
  }
  .import-msg {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  .agenda {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .day-label {
    font-weight: 600;
    opacity: 0.6;
    font-size: 0.75rem;
    margin-bottom: 0.2rem;
  }
  .event {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.25rem 0.4rem;
    border-radius: calc(var(--radius) - 2px);
    background: rgba(255, 255, 255, 0.02);
  }
  .time {
    width: 4.5rem;
    flex-shrink: 0;
    opacity: 0.6;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.72rem;
  }
  .ev-title {
    font-weight: 600;
  }
  .dim {
    opacity: 0.55;
    font-size: 0.75rem;
  }
  .danger {
    margin-left: auto;
    border-color: rgba(243, 139, 168, 0.4);
    color: var(--error);
  }
  .empty {
    opacity: 0.5;
  }
</style>
