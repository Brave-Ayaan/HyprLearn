import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { cpp } from "@codemirror/lang-cpp";
import { syntaxHighlighting } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { basicSetup } from "codemirror";
import { wmHandoffKeymap } from "../../util/codemirrorWm";
import { pastelHighlightStyle, editorChromeTheme } from "../../util/codemirrorTheme";

export interface CreateCodeEditorOptions {
  doc: string;
  parent: HTMLElement;
  onChange: (doc: string) => void;
}

export function createCodeEditor(opts: CreateCodeEditorOptions): EditorView {
  const state = EditorState.create({
    doc: opts.doc,
    extensions: [
      vim(),
      basicSetup,
      cpp(),
      syntaxHighlighting(pastelHighlightStyle),
      editorChromeTheme,
      wmHandoffKeymap(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) opts.onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        "&": { height: "100%", fontSize: "0.88rem" },
        "&.cm-editor.cm-focused": { outline: "none" },
        ".cm-scroller": { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
        ".cm-content": { padding: "0.5rem 0" },
      }),
    ],
  });
  return new EditorView({ state, parent: opts.parent });
}

export function replaceDoc(view: EditorView, doc: string) {
  if (view.state.doc.toString() === doc) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } });
}
