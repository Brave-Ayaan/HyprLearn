import { invoke } from "@tauri-apps/api/core";
import type { Flashcard } from "./types";

class FlashcardsStore {
  due: Flashcard[] = $state([]);
  all: Flashcard[] = $state([]);
  studyIndex = $state(0);
  revealed = $state(false);

  async refresh() {
    this.due = await invoke<Flashcard[]>("list_due_flashcards");
    this.all = await invoke<Flashcard[]>("list_all_flashcards");
    if (this.studyIndex >= this.due.length) this.studyIndex = 0;
  }

  async add(front: string, back: string, tags: string[]) {
    await invoke("add_flashcard", { front, back, tags });
    await this.refresh();
  }

  reveal() {
    this.revealed = true;
  }

  async grade(quality: number) {
    const card = this.due[this.studyIndex];
    if (!card) return;
    await invoke("review_flashcard", { id: card.id, quality });
    this.revealed = false;
    await this.refresh();
  }

  async remove(id: number) {
    await invoke("delete_flashcard", { id });
    await this.refresh();
  }
}

export const flashcardsStore = new FlashcardsStore();
