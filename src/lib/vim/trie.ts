export interface TrieNode {
  action?: string;
  children: Map<string, TrieNode>;
}

function emptyNode(): TrieNode {
  return { children: new Map() };
}

/**
 * A bare multi-character key with no modifier ("+") and no space separator
 * (e.g. "gg", "dd") is treated as a sequence of repeated single-char
 * presses. Anything else ("ctrl+h", "Escape", "1", "h") is one token.
 */
function tokenize(seq: string): string[] {
  if (seq.includes(" ")) return seq.split(" ");
  if (seq.includes("+") || seq.length <= 1) return [seq];
  if (/^[A-Z][a-z]+$/.test(seq)) return [seq]; // named keys: "Escape", "Tab", "Enter"...
  return seq.split("");
}

export function buildTrie(bindings: Record<string, string>): TrieNode {
  const root = emptyNode();
  for (const [seq, action] of Object.entries(bindings)) {
    let node = root;
    for (const token of tokenize(seq)) {
      let next = node.children.get(token);
      if (!next) {
        next = emptyNode();
        node.children.set(token, next);
      }
      node = next;
    }
    node.action = action;
  }
  return root;
}
