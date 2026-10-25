import type { SnippetLanguage } from "./editor";

export interface Snippet {
  id: number;
  title: string;
  language: SnippetLanguage;
  content: string;
  created_secs: number;
  updated_secs: number;
}
