import { tiling } from "../tiling/store.svelte";
import { vimState, setActionCommandResolver } from "../vim/stateMachine.svelte";
import { paletteState } from "./paletteState.svelte";
import { tileCatalog } from "../tiles/catalog";
import { fuzzyScore } from "../util/fuzzy";
import { focusedVaultSave, focusedVaultCloseGuard } from "../tiles/vault/focus";

export interface ActionDef {
  name: string;
  description: string;
  run: (arg?: string) => void | Promise<void>;
}

const defs: ActionDef[] = [
  { name: "tile.focus_left", description: "Focus left", run: () => tiling.focusMove("Left") },
  { name: "tile.focus_right", description: "Focus right", run: () => tiling.focusMove("Right") },
  { name: "tile.focus_up", description: "Focus up", run: () => tiling.focusMove("Up") },
  { name: "tile.focus_down", description: "Focus down", run: () => tiling.focusMove("Down") },

  { name: "tile.move_left", description: "Swap left", run: () => tiling.swap("Left") },
  { name: "tile.move_right", description: "Swap right", run: () => tiling.swap("Right") },
  { name: "tile.move_up", description: "Swap up", run: () => tiling.swap("Up") },
  { name: "tile.move_down", description: "Swap down", run: () => tiling.swap("Down") },

  { name: "tile.resize_left", description: "Resize left", run: () => tiling.resize("Left") },
  { name: "tile.resize_right", description: "Resize right", run: () => tiling.resize("Right") },
  { name: "tile.resize_up", description: "Resize up", run: () => tiling.resize("Up") },
  { name: "tile.resize_down", description: "Resize down", run: () => tiling.resize("Down") },

  { name: "tile.split_row", description: "Split right", run: (arg) => tiling.split("Row", arg || "dummy") },
  { name: "tile.split_column", description: "Split down", run: (arg) => tiling.split("Column", arg || "dummy") },
  {
    name: "tile.close",
    description: "Close tile",
    run: () => {
      if (focusedVaultCloseGuard.current && !focusedVaultCloseGuard.current()) return;
      tiling.close();
    },
  },
  { name: "tile.fullscreen_toggle", description: "Toggle fullscreen", run: () => tiling.toggleFullscreen() },
  { name: "tile.cycle_next", description: "Cycle next", run: () => tiling.cycle(true) },
  { name: "tile.cycle_prev", description: "Cycle previous", run: () => tiling.cycle(false) },
  { name: "tile.jump_to", description: "Jump to tile", run: (arg) => tiling.jumpTo(Number(arg)) },

  { name: "layout.mode_bsp", description: "Layout BSP", run: () => tiling.setMode("Bsp") },
  { name: "layout.mode_master_stack", description: "Layout master stack", run: () => tiling.setMode("MasterStack") },
  { name: "layout.mode_grid", description: "Layout grid", run: () => tiling.setMode("Grid") },
  { name: "layout.reset", description: "Reset layout", run: () => tiling.resetLayout() },

  { name: "app.enter_insert", description: "Insert mode", run: () => vimState.enterInsert() },
  { name: "app.enter_normal", description: "Normal mode", run: () => vimState.enterNormal() },
  { name: "app.enter_command", description: "Command mode", run: () => vimState.enterCommand() },
  { name: "app.command_palette", description: "Command palette", run: () => paletteState.show() },
  { name: "app.close_palette_or_noop", description: "Close palette", run: () => paletteState.hide() },

  { name: "vault.save", description: "Save file to Vault", run: () => void focusedVaultSave.current?.() },

  ...tileCatalog.map((t): ActionDef => ({
    name: `tile.open.${t.type}`,
    description: `Open ${t.label}`,
    run: () => tiling.split("Row", t.type),
  })),
];

export const actionRegistry = new Map(defs.map((d) => [d.name, d]));

/** The ":" command text that reaches this action via the fuzzy resolver - shown as a hint in the palette. */
export function commandHintFor(description: string): string {
  return `:${description.toLowerCase()}`;
}

export function dispatchAction(actionString: string): boolean {
  const [name, arg] = actionString.split(":");
  const def = actionRegistry.get(name);
  if (!def) {
    console.warn(`Unknown action: ${actionString}`);
    return false;
  }
  void def.run(arg);
  return true;
}

/**
 * Every action here is reachable as a ":" command too, not just through
 * Ctrl+K - typing the action's dotted name works verbatim, and anything
 * close to its name or description resolves via the same fuzzy match the
 * palette uses, so you never strictly need to open the palette.
 */
function resolveViaFuzzyMatch(input: string): string | undefined {
  const q = input.toLowerCase();
  if (actionRegistry.has(q)) return q;
  let best: { name: string; score: number } | null = null;
  for (const def of actionRegistry.values()) {
    const score = fuzzyScore(q, `${def.name} ${def.description}`.toLowerCase());
    if (score >= 0 && (!best || score > best.score)) best = { name: def.name, score };
  }
  return best?.name;
}

// Deferred: stateMachine.svelte.ts and this module import each other (the
// state machine dispatches actions; actions control vim state and need to
// register this resolver). Calling setActionCommandResolver synchronously
// at module-eval time can run before the other module's own top-level
// `let` bindings have initialized, depending on which side of the cycle
// the bundler reaches first - a queueMicrotask sidesteps that entirely by
// running after the whole module graph has finished evaluating.
queueMicrotask(() => setActionCommandResolver(resolveViaFuzzyMatch));
