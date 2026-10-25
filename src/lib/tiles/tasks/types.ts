export type Recurrence = "daily" | "weekly" | "monthly" | null;

export interface TaskRow {
  id: number;
  title: string;
  project: string | null;
  tags: string[];
  due_date: string | null;
  recurrence: Recurrence;
  completed: boolean;
  created_secs: number;
}

export interface NewTask {
  title: string;
  project: string | null;
  tags: string[];
  due_date: string | null;
  recurrence: Recurrence;
}
