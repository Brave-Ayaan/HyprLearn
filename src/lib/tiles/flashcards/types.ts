export interface Flashcard {
  id: number;
  front: string;
  back: string;
  tags: string[];
  ease: number;
  interval_days: number;
  repetitions: number;
  due_secs: number;
  created_secs: number;
}
