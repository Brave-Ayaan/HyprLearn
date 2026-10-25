import { invoke } from "@tauri-apps/api/core";
import type { Axis, Dir, Layout, LayoutMode } from "./types";

class TilingStore {
  layout: Layout | null = $state(null);

  async init() {
    this.layout = await invoke<Layout>("get_layout");
  }

  async split(axis: Axis, tileType: string) {
    this.layout = await invoke<Layout>("split_tile", { axis, tileType });
  }

  async close() {
    try {
      this.layout = await invoke<Layout>("close_tile");
    } catch {
      // last remaining tile; nothing to close
    }
  }

  async focusMove(dir: Dir) {
    this.layout = await invoke<Layout>("move_focus", { dir });
  }

  async swap(dir: Dir) {
    this.layout = await invoke<Layout>("swap_tile", { dir });
  }

  async resize(dir: Dir, delta = 0.05) {
    this.layout = await invoke<Layout>("resize_tile", { dir, delta });
  }

  async cycle(forward: boolean) {
    this.layout = await invoke<Layout>("cycle_focus", { forward });
  }

  async jumpTo(number: number) {
    try {
      this.layout = await invoke<Layout>("jump_to_tile", { number });
    } catch {
      // no tile with that number; ignore
    }
  }

  async toggleFullscreen() {
    this.layout = await invoke<Layout>("toggle_fullscreen");
  }

  async setMode(mode: LayoutMode) {
    this.layout = await invoke<Layout>("set_layout_mode", { mode });
  }

  async resetLayout() {
    this.layout = await invoke<Layout>("reset_layout");
  }
}

export const tiling = new TilingStore();
