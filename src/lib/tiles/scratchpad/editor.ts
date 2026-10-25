import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { basicSetup } from "codemirror";
import { wmHandoffKeymap } from "../../util/codemirrorWm";
import { pastelHighlightStyle, editorChromeTheme } from "../../util/codemirrorTheme";

export type SnippetLanguage = "plain" | "javascript" | "python" | "json" | "rust";

async function languageExtension(lang: SnippetLanguage) {
  if (lang === "javascript") {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({ typescript: true });
  }
  if (lang === "python") {
    const { python } = await import("@codemirror/lang-python");
    return python();
  }
  if (lang === "json") {
    const { json } = await import("@codemirror/lang-json");
    return json();
  }
  if (lang === "rust") {
    const { rust } = await import("@codemirror/lang-rust");
    return rust();
  }
  return null;
}

export interface CreateSnippetEditorOptions {
  doc: string;
  language: SnippetLanguage;
  parent: HTMLElement;
  onChange: (doc: string) => void;
}

export async function createSnippetEditor(opts: CreateSnippetEditorOptions): Promise<EditorView> {
  const langExt = await languageExtension(opts.language);
  const state = EditorState.create({
    doc: opts.doc,
    extensions: [
      vim(),
      basicSetup,
      ...(langExt ? [langExt] : []),
      syntaxHighlighting(pastelHighlightStyle),
      editorChromeTheme,
      wmHandoffKeymap(),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) opts.onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        "&": { height: "100%", fontSize: "0.9rem" },
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
