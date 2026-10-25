export interface VaultNode {
  name: string;
  relpath: string;
  is_dir: boolean;
  children: VaultNode[];
}

export interface FlatVaultRow {
  node: VaultNode;
  depth: number;
}

export function flattenVaultTree(nodes: VaultNode[], depth: number, expanded: Set<string>): FlatVaultRow[] {
  const out: FlatVaultRow[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.is_dir && expanded.has(node.relpath)) {
      out.push(...flattenVaultTree(node.children, depth + 1, expanded));
    }
  }
  return out;
}

export function parentDirOf(relpath: string): string {
  const idx = relpath.lastIndexOf("/");
  return idx === -1 ? "" : relpath.slice(0, idx);
}
