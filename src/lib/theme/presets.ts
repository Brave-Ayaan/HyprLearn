export interface ThemeTokens {
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

/**
 * Bundled theme presets. Settings -> Appearance lets you pick one (which
 * copies its tokens into the live config.theme, so it stays editable
 * afterwards). To add your own, add an entry here and it shows up in that
 * picker - no other wiring needed.
 */
export const themePresets: ThemeTokens[] = [
  {
    name: "One Dark Pro",
    accent: "#61afef",
    background: "#282c34",
    foreground: "#abb2bf",
    surface: "#2c313a",
    overlay: "#323842",
    border: "#3e4451",
    success: "#98c379",
    warning: "#e5c07b",
    error: "#e06c75",
    border_radius: 6,
  },
  {
    name: "Catppuccin Mocha",
    accent: "#cba6f7",
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    surface: "#232334",
    overlay: "#302d41",
    border: "#45475a",
    success: "#a6e3a1",
    warning: "#f9e2af",
    error: "#f38ba8",
    border_radius: 6,
  },
  {
    name: "Nord",
    accent: "#88c0d0",
    background: "#2e3440",
    foreground: "#d8dee9",
    surface: "#333a46",
    overlay: "#3b4252",
    border: "#4c566a",
    success: "#a3be8c",
    warning: "#ebcb8b",
    error: "#bf616a",
    border_radius: 4,
  },
  {
    name: "Gruvbox Dark",
    accent: "#d79921",
    background: "#282828",
    foreground: "#ebdbb2",
    surface: "#2c2c2c",
    overlay: "#3c3836",
    border: "#504945",
    success: "#98971a",
    warning: "#d79921",
    error: "#cc241d",
    border_radius: 2,
  },
];
