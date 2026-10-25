import type { AppConfig } from "../config/types";
import { dispatchAction } from "../actions/registry";
import { buildTrie, type TrieNode } from "./trie";
import type { Mode } from "./types";

function emptyTrie(): TrieNode {
  return { children: new Map() };
}

function isEditableElement(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

class VimStateMachine {
  mode: Mode = $state("Normal");
  pendingKeys: string = $state("");
  commandBuffer: string = $state("");

  private normalTrie: TrieNode = emptyTrie();
  private leaderTrie: TrieNode = emptyTrie();
  private visualTrie: TrieNode = emptyTrie();
  private globalTrie: TrieNode = emptyTrie();
  private commandMap: Record<string, string> = {};

  private cursor: TrieNode | null = null;
  private leaderKey = "ctrl+ ";

  configure(config: AppConfig) {
    this.normalTrie = buildTrie(config.keybindings.normal);
    this.leaderTrie = buildTrie(config.keybindings.leader);
    this.visualTrie = buildTrie(config.keybindings.visual);
    this.globalTrie = buildTrie(config.keybindings.global);
    this.commandMap = config.keybindings.command;
    this.leaderKey = config.layout.leader_key || "ctrl+ ";
  }

  enterInsert() {
    this.mode = "Insert";
    this.resetBuffer();
  }

  enterNormal() {
    this.mode = "Normal";
    this.resetBuffer();
    this.commandBuffer = "";
  }

  enterCommand() {
    this.mode = "Command";
    this.commandBuffer = "";
  }

  enterVisual() {
    this.mode = "Visual";
    this.resetBuffer();
  }

  /**
   * For tiles that embed their own full keyboard-capturing engine (e.g. a
   * real vim editor): call this instead of relying on keydown bubbling to
   * hand off to the WM leader sequence. The caller should blur its own
   * input first so the *next* keydown reaches this state machine untouched.
   */
  enterLeaderAwaitingKey() {
    this.mode = "Leader";
    this.cursor = this.leaderTrie;
    this.pendingKeys = this.leaderKey;
  }

  /** Returns true if the WM layer consumed the key (caller should preventDefault). */
  handleKeydown(e: KeyboardEvent): boolean {
    const token = this.keyToken(e);

    const globalHit = this.globalTrie.children.get(token);
    if (globalHit?.action) {
      dispatchAction(globalHit.action);
      return true;
    }

    // Leader mode is persistent: once engaged, it waits indefinitely for a
    // valid continuation - no matter how long the pause - and only Escape
    // backs out. An unrecognized key doesn't cancel the chord, it just
    // resets to the top of the leader table so the next key gets a fresh
    // shot (e.g. Ctrl+Space, wait an hour, "o", wait, "c" still opens Calculator).
    if (this.mode === "Leader") {
      if (token === "Escape") {
        this.enterNormal();
        return true;
      }
      const next = this.cursor?.children.get(token);
      if (!next) {
        this.cursor = this.leaderTrie;
        this.pendingKeys = this.leaderKey;
        return true;
      }
      this.pendingKeys += " " + token;
      if (next.action) {
        dispatchAction(next.action);
        this.enterNormal();
        return true;
      }
      this.cursor = next;
      return true;
    }

    if (this.mode === "Insert") {
      if (token === "Escape") {
        this.enterNormal();
        return true;
      }
      return false; // pass through to the focused tile's own text engine
    }

    if (this.mode === "Command") {
      return this.handleCommandKey(token);
    }

    // Safety net: a plain form control (input/textarea/select/contenteditable)
    // has native DOM focus but the tile never explicitly called enterInsert()
    // on it. Rather than require every tile to wire that up, let anything
    // typed into such a control through by default - only the leader key
    // and Escape keep WM-level meaning while it has focus.
    const activeEditable = document.activeElement;
    if (this.mode === "Normal" && isEditableElement(activeEditable)) {
      if (token === this.leaderKey) {
        this.mode = "Leader";
        this.cursor = this.leaderTrie;
        this.pendingKeys = token;
        return true;
      }
      if (token === "Escape") {
        activeEditable.blur();
        return true;
      }
      return false;
    }

    if (this.mode === "Normal" && !this.cursor && token === this.leaderKey) {
      this.mode = "Leader";
      this.cursor = this.leaderTrie;
      this.pendingKeys = token;
      return true;
    }

    const activeTrie = this.cursor ?? (this.mode === "Visual" ? this.visualTrie : this.normalTrie);
    const next = activeTrie.children.get(token);

    if (!next) {
      const wasMidSequence = this.cursor !== null;
      this.resetBuffer();
      // Mid a bare (non-leader) multi-key sequence like "gg": an
      // unrecognized key just cancels that attempt, same as persistent
      // leader mode does, rather than leaking it to the focused tile.
      return wasMidSequence || false;
    }

    this.pendingKeys += (this.pendingKeys ? " " : "") + token;

    if (next.action) {
      dispatchAction(next.action);
      this.resetBuffer();
      return true;
    }

    // Partial match of a bare multi-key sequence - persists just like a
    // leader chord does, waiting for the next key with no timeout.
    this.cursor = next;
    return true;
  }

  private handleCommandKey(token: string): boolean {
    if (token === "Enter") {
      const action = this.resolveCommand(this.commandBuffer.trim());
      if (action) dispatchAction(action);
      else console.warn(`Unknown command: :${this.commandBuffer}`);
      this.enterNormal();
      return true;
    }
    if (token === "Escape") {
      this.enterNormal();
      return true;
    }
    if (token === "Backspace") {
      this.commandBuffer = this.commandBuffer.slice(0, -1);
      return true;
    }
    if (token.length === 1) {
      this.commandBuffer += token;
    }
    return true;
  }

  /** Exact TOML-defined aliases first, then a fuzzy match over every action. */
  private resolveCommand(input: string): string | undefined {
    if (!input) return undefined;
    const exact = this.commandMap[input];
    if (exact) return exact;
    return resolveActionCommand(input);
  }

  private resetBuffer() {
    this.cursor = null;
    this.pendingKeys = "";
  }

  private keyToken(e: KeyboardEvent): string {
    const mods: string[] = [];
    if (e.ctrlKey) mods.push("ctrl");
    if (e.metaKey) mods.push("cmd");
    if (e.altKey) mods.push("alt");
    if (e.shiftKey && e.key.length > 1) mods.push("shift");
    return mods.length ? [...mods, e.key].join("+") : e.key;
  }
}

// Set by actions/registry.ts (which itself imports vimState) to avoid a
// circular import at module-eval time; see resolveCommand above.
export let resolveActionCommand: (input: string) => string | undefined = () => undefined;
export function setActionCommandResolver(fn: (input: string) => string | undefined) {
  resolveActionCommand = fn;
}

export const vimState = new VimStateMachine();
