import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { LanguageDescription, syntaxHighlighting } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { basicSetup } from "codemirror";
import { wmHandoffKeymap } from "../../util/codemirrorWm";
import { pastelHighlightStyle, editorChromeTheme } from "../../util/codemirrorTheme";

// Deliberately NOT @codemirror/language-data's full catalog: that catalog
// references dozens of language packages we haven't installed, and a fenced
// code block in an unsupported language would try (and fail) to dynamically
// import a package that doesn't exist. This list only names packages that
// are actual dependencies.
const codeLanguages = [
  LanguageDescription.of({
    name: "javascript",
    alias: ["js", "jsx", "typescript", "ts", "tsx"],
    async load() {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript({ typescript: true });
    },
  }),
  LanguageDescription.of({
    name: "python",
    alias: ["py"],
    async load() {
      const { python } = await import("@codemirror/lang-python");
      return python();
    },
  }),
  LanguageDescription.of({
    name: "json",
    alias: [],
    async load() {
      const { json } = await import("@codemirror/lang-json");
      return json();
    },
  }),
  LanguageDescription.of({
    name: "rust",
    alias: ["rs"],
    async load() {
      const { rust } = await import("@codemirror/lang-rust");
      return rust();
    },
  }),
];

export interface CreateEditorOptions {
  doc: string;
  parent: HTMLElement;
  onChange: (doc: string) => void;
}

export function createEditor(opts: CreateEditorOptions): EditorView {
  const state = EditorState.create({
    doc: opts.doc,
    extensions: [
      vim(),
      basicSetup,
      markdown({ codeLanguages }),
      syntaxHighlighting(pastelHighlightStyle),
      editorChromeTheme,
      wmHandoffKeymap(),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) opts.onChange(update.state.doc.toString());
      }),
      EditorView.theme({
        "&": { height: "100%", fontSize: "0.95rem" },
        "&.cm-editor.cm-focused": { outline: "none" },
        ".cm-scroller": { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
        ".cm-content": { padding: "0.6rem 0" },
      }),
    ],
  });
  return new EditorView({ state, parent: opts.parent });
}

export function replaceDoc(view: EditorView, doc: string) {
  if (view.state.doc.toString() === doc) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } });
}
