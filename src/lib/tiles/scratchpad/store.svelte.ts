import { invoke } from "@tauri-apps/api/core";
import type { Snippet } from "./types";
import type { SnippetLanguage } from "./editor";

const AUTOSAVE_DELAY_MS = 500;

class ScratchpadStore {
  snippets: Snippet[] = $state([]);
  currentId: number | null = $state(null);
  content: string = $state("");
  dirty = $state(false);
  saving = $state(false);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly current = $derived(this.snippets.find((s) => s.id === this.currentId) ?? null);

  async refresh() {
    this.snippets = await invoke<Snippet[]>("list_snippets");
  }

  async open(id: number) {
    await this.flushPendingSave();
    this.currentId = id;
    const snippet = this.snippets.find((s) => s.id === id);
    this.content = snippet?.content ?? "";
    this.dirty = false;
  }

  async createAndOpen(title: string, language: SnippetLanguage) {
    const snippet = await invoke<Snippet>("create_snippet", { title, language });
    await this.refresh();
    await this.open(snippet.id);
  }

  async rename(title: string, language: SnippetLanguage) {
    if (this.currentId === null) return;
    await invoke("rename_snippet", { id: this.currentId, title, language });
    await this.refresh();
  }

  async remove() {
    if (this.currentId === null) return;
    await invoke("delete_snippet", { id: this.currentId });
    this.currentId = null;
    this.content = "";
    await this.refresh();
  }

  setContent(next: string) {
    this.content = next;
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.save(), AUTOSAVE_DELAY_MS);
  }

  async save() {
    if (this.currentId === null || !this.dirty) return;
    this.saving = true;
    try {
      await invoke("save_snippet", { id: this.currentId, content: this.content });
      this.dirty = false;
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

export const scratchpadStore = new ScratchpadStore();
