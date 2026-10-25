<div align="center">

# ⌨️ HyprLearn

**A vim-modal tiling window manager for Windows, fused with a 43-tile STEM, security, and AI toolkit — 100% local, no network calls, no telemetry.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white)](#getting-started)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev)
[![Rust](https://img.shields.io/badge/Rust-2024_edition-000000?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![100% Local](https://img.shields.io/badge/data-100%25_local-success)](#configuration--your-data)
[![Tests](https://img.shields.io/badge/tests-83_passing-brightgreen)](#testing)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Why HyprLearn](#why-hyprlearn)
- [Features](#features)
  - [Core window manager](#core-window-manager)
  - [📐 Math & Science](#-math--science)
  - [💻 CS & Dev Tools](#-cs--dev-tools)
  - [🔐 Security](#-security)
  - [🤖 AI / ML](#-ai--ml)
  - [📅 Productivity](#-productivity)
  - [⚙️ System](#-system)
- [Keyboard-First Workflow](#keyboard-first-workflow)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install & Run](#install--run)
  - [Production Build](#production-build)
- [Project Structure](#project-structure)
- [Configuration & Your Data](#configuration--your-data)
- [Testing](#testing)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

HyprLearn is a desktop app that treats your whole workspace like a [Hyprland](https://hyprlang.org/)-style tiling window manager — except instead of managing other applications, it tiles **43 built-in tools**: calculators, a CAS, a physics sandbox, a real vim code editor that compiles C/C++, a JWT inspector, a neural-network shape visualizer, flashcards, a Pomodoro timer, and more — all inside one window, navigable entirely from the keyboard.

Every pane splits, resizes, and focuses the way tmux/i3/Hyprland panes do. Every keystroke is interpreted by a small vim-style modal state machine (Normal / Insert / Visual / Command / Leader) shared across the whole app, so the muscle memory you already have transfers directly.

## Why HyprLearn

| | |
|---|---|
| 🧩 **One app, 43 tools** | No more ten different websites and apps for calculators, cheat sheets, and reference material. |
| ⌨️ **Keyboard-first, always** | A persistent leader key (`Ctrl+Space`), a fuzzy `Ctrl+K` palette, and `:` ex-commands — every single action is reachable without touching the mouse. |
| 🔒 **100% local** | No network calls, no telemetry, no accounts. Your tasks, notes, flashcards, and files live in a `config/` folder right next to the app, not some opaque app-data directory. |
| 🎨 **Fully themeable** | Four bundled presets (One Dark Pro, Catppuccin Mocha, Nord, Gruvbox Dark) or hand-tune every color token. |
| 📖 **Self-documenting** | `:help` opens a living reference of *every* command the app has, cross-referenced against your actual keybindings — never stale docs. |

## Features

### Core window manager

- **Tiling engine** — BSP, master-stack, and grid layouts; splitting always rebalances the whole layout to **exactly equal area** per tile, even for odd counts.
- **Persistent leader key** — press `Ctrl+Space`, then take as long as you want before the next key; only `Escape` cancels. No fragile timeouts.
- **Command palette + `:` commands** — `Ctrl+K` or `:` reach the same fuzzy-matched action list; literally everything in the palette is also a typed command.
- **Waybar-style system bar** — live CPU/RAM and every open tile, click to jump to any of them.
- **Graceful small-tile handling** — shrink a tile below a usable size and it shows a clear placeholder instead of garbled content; the tile keeps its state underneath.

### 📐 Math & Science

| Tile | What it does |
|---|---|
| Calculator | Expression parser with symbolic differentiation and LaTeX rendering |
| Graphing Calculator | Live function plotting |
| Algebra / CAS | Symbolic algebra workbench |
| Matrix Workbench | Determinant, inverse, RREF, eigenvalues (QR algorithm) |
| LaTeX Scratchpad | Live-rendered LaTeX via KaTeX |
| Unit Converter | Cross-category unit conversion |
| Physical Constants | Searchable reference |
| Formula Sheet | Searchable formula reference |
| Physics Simulator | Interactive physics demos |
| Physics Sandbox | Click to drop balls — real gravity, drag, wall bounces, elastic collisions |
| Periodic Table | All 118 elements, color-coded by category |
| Conway's Game of Life | Toroidal grid, click-to-paint, standard B3/S23 rules |
| Probability / Dice Simulator | Animated histogram converging on the theoretical distribution |
| Gradient Descent Playground | Watch a line fit scattered points live, one gradient step at a time |

### 💻 CS & Dev Tools

| Tile | What it does |
|---|---|
| Big-O Visualizer | Complexity growth curves |
| Base Converter / IEEE-754 | Binary/hex/octal + float bit-layout inspector |
| Regex Tester | Live match highlighting |
| JSON/YAML/CSV Formatter | Format, validate, convert between formats |
| Git Cheat Sheet | Searchable command reference |
| Data Structure Visualizer | Interactive DS walkthroughs |
| Code Runner | Real vim editor (CodeMirror + actual vim keybindings) that compiles and runs **C/C++** via your local gcc/g++, under a hard timeout |
| C++ Cheat Sheet | Searchable reference |

### 🔐 Security

| Tile | What it does |
|---|---|
| Hash Calculator | Common hash algorithms |
| Encoding Toolkit | Base64 / URL / Hex / Caesar / XOR, encode and decode |
| Password Entropy | Strength estimation against common-password lists |
| CVE / Terminology Glossary | Searchable security terminology |
| Network Tools | IPv4 subnet/CIDR calculator and reference |
| JWT Inspector | Decodes header/payload locally; verifies HS256/384/512 signatures via the Web Crypto API — no server round-trip |
| Classical Ciphers | Vigenère, Atbash, and Rail Fence encode/decode |

### 🤖 AI / ML

| Tile | What it does |
|---|---|
| Tensor Shape Calculator | Work out shapes through common layer ops |
| Neural Network Visualizer | Interactive network diagram |
| Tokenizer / Prompt Length | A real trained BPE tokenizer |
| ML Cheat Sheet | Searchable reference |

### 📅 Productivity

| Tile | What it does |
|---|---|
| Notes | Markdown notes with tag extraction, autosaving |
| Vault | An Obsidian-style file tree for **any plain-text file** — code, markdown, config, whatever. Explicit save only (`:save`) with crash-recovery drafts; it never silently discards unsaved work |
| Tasks | To-dos with recurrence |
| Flashcards | SM-2 spaced repetition |
| Pomodoro Timer | Session tracking with stats |
| Scratchpad | Quick multi-snippet vim editor |
| Now Playing | Album art, seek, and transport controls for whatever's playing on Windows |
| Calendar | Local event calendar |

### ⚙️ System

| Tile | What it does |
|---|---|
| Settings | Theme presets & custom colors, layout, folder pickers, raw keybindings editor |
| HyprLearn | The in-app tutorial and full searchable command reference — this is `:help` |

## Keyboard-First Workflow

Everything routes through one shared modal state machine:

| Mode | Meaning | Enter with |
|---|---|---|
| Normal | Default; a few WM shortcuts are reserved, everything else passes through | `Escape` |
| Insert | Typing into a field | Click/Tab into any field |
| Leader | Mid a WM command, waiting for the next key (**no timeout**) | `Ctrl+Space` |
| Command | Typing a `:` ex-command | `:` |

Core bindings (leader = `Ctrl+Space`):

| Keys | Action |
|---|---|
| `h` `j` `k` `l` | Focus left / down / up / right |
| `H` `J` `K` `L` | Swap the focused tile with its neighbor |
| `s` / `S` | Split right / split down |
| `x` | Close the focused tile |
| `f` | Toggle fullscreen |
| `b` / `m` / `g` | Layout mode: BSP / Master-Stack / Grid |
| `1`–`9` | Jump to tile number N |
| `o` then a letter | Open a specific tile |
| `Ctrl+K` or `:` | Fuzzy palette / command line — reaches **every** action, always |

Every tile-open shortcut, and every single command in the app, is documented live inside `:help` — it reads your actual config, so it can never go stale.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm
- [Rust](https://rustup.rs/) 1.90+ (edition 2024)
- **Windows**: the [Tauri prerequisites](https://tauri.app/start/prerequisites/) — Microsoft C++ Build Tools (*Desktop development with C++* workload) and the WebView2 runtime (preinstalled on Windows 11)
- *Optional:* a C/C++ compiler (`gcc`/`g++`) on your `PATH`, only needed for the Code Runner tile

### Install & Run

```bash
git clone https://github.com/Brave-Ayaan/HyprLearn.git
cd HyprLearn
npm install
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

Outputs an installer/executable under `src-tauri/target/release/bundle/`.

## Project Structure

```
HyprLearn/
├── src/                      # Svelte 5 + TypeScript frontend
│   ├── lib/
│   │   ├── tiles/             # Every tile lives in its own folder (component + logic)
│   │   ├── tiling/            # Tree-based tiling layout engine (frontend mirror of the Rust tree)
│   │   ├── vim/                # The shared modal input state machine
│   │   ├── actions/            # Action registry — backs the palette, :, and keybindings
│   │   ├── math/                # Expression parser, AST, matrix algebra
│   │   └── components/         # Shared UI: TileTree, StatusBar, SystemBar, CommandPalette
│   └── main.ts
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── tiling/              # The authoritative tiling tree (splits, focus, resize)
│   │   ├── vault.rs             # File-tree notes backend (path-safe, draft recovery)
│   │   ├── config.rs            # TOML config, project-local paths
│   │   └── *.rs                 # One module per data-backed tile (tasks, flashcards, …)
│   └── resources/default_config.toml   # Bundled default keybindings/theme
└── config/                    # Created at runtime: your config.toml, layout, and data (git-ignored)
```

## Configuration & Your Data

Everything HyprLearn stores lives inside the project folder, not the OS app-data directory:

- **`config/config.toml`** — keybindings, theme, layout settings. Editable live from Settings, or by hand (it's a plain TOML dotfile).
- **`config/layout.json`** — your last window layout, restored on next launch.
- **`config/*.db`** — SQLite databases for Tasks, Flashcards, Pomodoro, Scratchpad, Calendar.
- **`vault/`** — the Vault tile's files, by default.

All of the above are listed in `.gitignore` — they're your personal data, not source code, and are recreated automatically on first run.

## Testing

```bash
npm run test          # Vitest — 55 tests over pure-logic modules (ciphers, JWT, matrix algebra, game engines, fuzzy match, URL parsing)
cd src-tauri && cargo test   # Rust — 28 tests over the tiling engine, config, and vault path safety
```

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | [Tauri 2](https://tauri.app) |
| UI | [Svelte 5](https://svelte.dev) (runes) + TypeScript |
| Code editing | [CodeMirror 6](https://codemirror.net/) + [`@replit/codemirror-vim`](https://github.com/replit/codemirror-vim) |
| Backend | Rust, [`rusqlite`](https://github.com/rusqlite/rusqlite) (bundled SQLite), [`tokio`](https://tokio.rs/) |
| Math rendering | [KaTeX](https://katex.org/) |
| Testing | [Vitest](https://vitest.dev/) (frontend), Rust's built-in test harness (backend) |

## Contributing

Issues and pull requests are welcome. If you're adding a tile, follow the existing pattern: a folder under `src/lib/tiles/<name>/`, a registry entry in `catalog.ts` + `registry.ts`, and (if it has non-trivial logic) a few Vitest tests alongside it.

## License

[MIT](LICENSE)
