import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import type { Extension } from "@codemirror/state";
import { syntaxHighlighting } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { basicSetup } from "codemirror";
import { wmHandoffKeymap } from "../../util/codemirrorWm";
import { pastelHighlightStyle, editorChromeTheme } from "../../util/codemirrorTheme";

/** Local-only language detection by extension - no network language-data fetches. */
function languageForFilename(name: string): Extension[] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "c":
    case "h":
    case "cpp":
    case "cc":
    case "cxx":
    case "hpp":
    case "hh":
      return [cpp()];
    case "js":
    case "mjs":
    case "jsx":
      return [javascript({ jsx: ext === "jsx" })];
    case "ts":
    case "tsx":
      return [javascript({ typescript: true, jsx: ext === "tsx" })];
    case "json":
      return [json()];
    case "md":
    case "markdown":
      return [markdown()];
    case "py":
      return [python()];
    case "rs":
      return [rust()];
    default:
      return [];
  }
}

export interface CreateVaultEditorOptions {
  doc: string;
  filename: string;
  parent: HTMLElement;
  onChange: (doc: string) => void;
}

export function createVaultEditor(opts: CreateVaultEditorOptions): EditorView {
  const state = EditorState.create({
    doc: opts.doc,
    extensions: [
      vim(),
      basicSetup,
      ...languageForFilename(opts.filename),
      syntaxHighlighting(pastelHighlightStyle),
      editorChromeTheme,
      wmHandoffKeymap(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) opts.onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        "&": { height: "100%", fontSize: "0.86rem" },
        "&.cm-editor.cm-focused": { outline: "none" },
        ".cm-scroller": { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
        ".cm-content": { padding: "0.5rem 0" },
      }),
    ],
  });
  return new EditorView({ state, parent: opts.parent });
}

export function replaceVaultDoc(view: EditorView, doc: string) {
  if (view.state.doc.toString() === doc) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } });
}
