/**
 * Metadata-only list of openable tile types (no component imports, so this
 * can be safely imported by both tiles/registry.ts and actions/registry.ts
 * without creating an import cycle). Every entry here should have a
 * matching component registered in tiles/registry.ts.
 */
export interface TileCatalogEntry {
  type: string;
  label: string;
}

export const tileCatalog: TileCatalogEntry[] = [
  { type: "calculator", label: "Calculator" },
  { type: "notes", label: "Notes" },
  { type: "tasks", label: "Tasks" },
  { type: "graphing", label: "Graphing Calculator" },
  { type: "cas", label: "Algebra / CAS" },
  { type: "matrix", label: "Matrix Workbench" },
  { type: "latex", label: "LaTeX Scratchpad" },
  { type: "unitconverter", label: "Unit Converter" },
  { type: "constants", label: "Physical Constants" },
  { type: "formulasheet", label: "Formula Sheet" },
  { type: "physicssim", label: "Physics Simulator" },
  { type: "bigo", label: "Big-O Visualizer" },
  { type: "baseconverter", label: "Base Converter / IEEE-754" },
  { type: "regex", label: "Regex Tester" },
  { type: "dataformatter", label: "JSON/YAML/CSV Formatter" },
  { type: "gitcheatsheet", label: "Git Cheat Sheet" },
  { type: "datastructures", label: "Data Structure Visualizer" },
  { type: "hashcalc", label: "Hash Calculator" },
  { type: "encoding", label: "Encoding Toolkit" },
  { type: "passwordentropy", label: "Password Entropy" },
  { type: "cve", label: "CVE / Terminology Glossary" },
  { type: "network", label: "Network Tools" },
  { type: "tensorshape", label: "Tensor Shape Calculator" },
  { type: "nnviz", label: "Neural Network Visualizer" },
  { type: "tokenizer", label: "Tokenizer / Prompt Length" },
  { type: "mlcheatsheet", label: "ML Cheat Sheet" },
  { type: "flashcards", label: "Flashcards" },
  { type: "pomodoro", label: "Pomodoro Timer" },
  { type: "scratchpad", label: "Scratchpad" },
  { type: "media", label: "Now Playing" },
  { type: "calendar", label: "Calendar" },
  { type: "settings", label: "Settings" },
  { type: "hyprlearn", label: "HyprLearn (Help & Tutorial)" },
  { type: "cppcheatsheet", label: "C++ Cheat Sheet" },
  { type: "physicssandbox", label: "Physics Sandbox" },
  { type: "coderunner", label: "Code Runner (C/C++)" },
  { type: "periodictable", label: "Periodic Table" },
  { type: "gameoflife", label: "Conway's Game of Life" },
  { type: "probability", label: "Probability / Dice Simulator" },
  { type: "vault", label: "Vault (File Notes)" },
  { type: "jwt", label: "JWT Inspector" },
  { type: "classicalciphers", label: "Classical Ciphers" },
  { type: "gradientdescent", label: "Gradient Descent Playground" },
];
