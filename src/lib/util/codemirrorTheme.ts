import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/**
 * A soft, pastel syntax palette (readable on a dark One Dark Pro-ish
 * background without the harsh saturation of basicSetup's default
 * highlighting). Shared by every CodeMirror-based tile.
 */
export const pastelHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#c8a8ff" },
  { tag: [t.controlKeyword, t.moduleKeyword], color: "#c8a8ff", fontWeight: "bold" },
  { tag: [t.string, t.special(t.string)], color: "#b8e8b0" },
  { tag: [t.number, t.bool, t.null], color: "#ffcc99" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#8a93a8", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#a8d8ff" },
  { tag: [t.className, t.typeName], color: "#ffe6a8" },
  { tag: t.propertyName, color: "#a8e0e8" },
  { tag: t.variableName, color: "#d8dee9" },
  { tag: [t.operator, t.punctuation], color: "#d0a8e8" },
  { tag: t.definition(t.variableName), color: "#d8dee9", fontWeight: "bold" },
  { tag: t.atom, color: "#ffcc99" },
  { tag: t.meta, color: "#8a93a8" },
  { tag: t.invalid, color: "#ff9999", textDecoration: "underline" },
  { tag: t.tagName, color: "#c8a8ff" },
  { tag: t.attributeName, color: "#a8d8ff" },
  { tag: t.heading, color: "#a8d8ff", fontWeight: "bold" },
  { tag: t.link, color: "#a8d8ff", textDecoration: "underline" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.monospace, color: "#b8e8b0" },
]);

/** Base chrome (background, selection, cursor, gutters) matching the app's own theme tokens. */
export const editorChromeTheme = EditorView.theme(
  {
    "&": { backgroundColor: "transparent" },
    ".cm-content": { caretColor: "#c8a8ff" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#c8a8ff" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(200, 168, 255, 0.25)",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
    ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "#5c6370" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "rgba(200, 168, 255, 0.2)",
      outline: "none",
    },
  },
  { dark: true },
);
