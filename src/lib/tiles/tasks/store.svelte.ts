import { invoke } from "@tauri-apps/api/core";
import type { NewTask, TaskRow } from "./types";

class TasksStore {
  tasks: TaskRow[] = $state([]);
  selected: number = $state(0);
  projectFilter: string | null = $state(null);
  tagFilter: string | null = $state(null);

  readonly projects = $derived.by(() => {
    const set = new Set<string>();
    for (const t of this.tasks) if (t.project) set.add(t.project);
    return [...set].sort();
  });

  readonly tags = $derived.by(() => {
    const set = new Set<string>();
    for (const t of this.tasks) for (const tag of t.tags) set.add(tag);
    return [...set].sort();
  });

  readonly filtered = $derived.by(() => {
    return this.tasks.filter(
      (t) =>
        (!this.projectFilter || t.project === this.projectFilter) &&
        (!this.tagFilter || t.tags.includes(this.tagFilter)),
    );
  });

  async refresh() {
    this.tasks = await invoke<TaskRow[]>("list_tasks");
    if (this.selected >= this.filtered.length) {
      this.selected = Math.max(0, this.filtered.length - 1);
    }
  }

  async add(task: NewTask) {
    await invoke<TaskRow>("add_task", { task });
    await this.refresh();
  }

  async toggleSelected() {
    const task = this.filtered[this.selected];
    if (!task) return;
    this.tasks = await invoke<TaskRow[]>("toggle_task", { id: task.id });
  }

  async deleteSelected() {
    const task = this.filtered[this.selected];
    if (!task) return;
    await invoke("delete_task", { id: task.id });
    await this.refresh();
  }

  moveSelection(delta: number) {
    const n = this.filtered.length;
    if (n === 0) return;
    this.selected = Math.min(Math.max(this.selected + delta, 0), n - 1);
  }
}

export const tasksStore = new TasksStore();
