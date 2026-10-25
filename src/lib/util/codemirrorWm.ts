import { Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { vimState } from "../vim/stateMachine.svelte";
import { paletteState } from "../actions/paletteState.svelte";

/**
 * Explicit hand-off keymap for any tile embedding a full CodeMirror+vim
 * editor. Bound above vim's own handling (Prec.highest). codemirror-vim
 * only claims keys it has an actual vim binding for and lets everything
 * else continue through CodeMirror's normal keymap facet, so these two
 * combos (neither bound by default vim) reach us reliably. We blur first
 * so the *next* keystroke (resolving the leader chord, or typing into the
 * palette) goes straight to the window-level listener untouched by
 * CodeMirror or vim-mode.
 */
export function wmHandoffKeymap() {
  return Prec.highest(
    keymap.of([
      {
        key: "Ctrl-Space",
        run: (view: EditorView) => {
          view.contentDOM.blur();
          vimState.enterLeaderAwaitingKey();
          return true;
        },
      },
      {
        key: "Mod-k",
        run: (view: EditorView) => {
          view.contentDOM.blur();
          paletteState.show();
          return true;
        },
      },
    ]),
  );
}
