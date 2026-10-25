import { invoke } from "@tauri-apps/api/core";
import { fuzzyScore } from "../../util/fuzzy";
import type { NoteMeta } from "./types";

const AUTOSAVE_DELAY_MS = 500;

class NotesStore {
  notes: NoteMeta[] = $state([]);
  currentName: string | null = $state(null);
  content: string = $state("");
  dirty: boolean = $state(false);
  saving: boolean = $state(false);
  searchQuery: string = $state("");
  activeTag: string | null = $state(null);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly allTags = $derived.by(() => {
    const tags = new Set<string>();
    for (const n of this.notes) for (const t of n.tags) tags.add(t);
    return [...tags].sort();
  });

  readonly filtered = $derived.by(() => {
    let list = this.notes;
    if (this.activeTag) list = list.filter((n) => n.tags.includes(this.activeTag!));
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list
      .map((note) => ({ note, score: fuzzyScore(q, `${note.name} ${note.preview} ${note.tags.join(" ")}`.toLowerCase()) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.note);
  });

  async refreshList() {
    this.notes = await invoke<NoteMeta[]>("list_notes");
  }

  async open(name: string) {
    await this.flushPendingSave();
    this.currentName = name;
    this.content = await invoke<string>("read_note", { name });
    this.dirty = false;
  }

  async createAndOpen(title: string) {
    const name = await invoke<string>("create_note", { title });
    await this.refreshList();
    await this.open(name);
  }

  async deleteCurrent() {
    if (!this.currentName) return;
    await invoke("delete_note", { name: this.currentName });
    this.currentName = null;
    this.content = "";
    await this.refreshList();
  }

  /** Called on every editor change; debounces the actual disk write. */
  setContent(next: string) {
    this.content = next;
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.save(), AUTOSAVE_DELAY_MS);
  }

  async save() {
    if (!this.currentName || !this.dirty) return;
    this.saving = true;
    try {
      await invoke("write_note", { name: this.currentName, content: this.content });
      this.dirty = false;
      await this.refreshList(); // picks up updated preview/tags/modified time
    } finally {
      this.saving = false;
    }
  }

  private async flushPendingSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.save();
  }
}

export const notesStore = new NotesStore();
