export interface KeybindingsConfig {
  normal: Record<string, string>;
  leader: Record<string, string>;
  visual: Record<string, string>;
  command: Record<string, string>;
  global: Record<string, string>;
}

export interface LayoutConfig {
  default_mode: string;
  gaps: number;
  border_width: number;
  startup_tiles: string[];
  leader_key: string;
}

export interface ThemeConfig {
  name: string;
  accent: string;
  background: string;
  foreground: string;
  surface: string;
  overlay: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  border_radius: number;
}

export interface NotesConfig {
  directory: string | null;
}

export interface AppConfig {
  keybindings: KeybindingsConfig;
  layout: LayoutConfig;
  theme: ThemeConfig;
  notes: NotesConfig;
}
