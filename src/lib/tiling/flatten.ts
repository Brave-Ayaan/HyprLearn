import type { TreeNode } from "./types";

export interface FlatLeaf {
  id: number;
  tile_type: string;
}

/** DFS order, matching Rust's `Layout::leaves()` - the same order jump_to_tile(N) uses. */
export function flattenLeaves(node: TreeNode, out: FlatLeaf[] = []): FlatLeaf[] {
  if (node.kind === "Leaf") {
    out.push({ id: node.id, tile_type: node.tile_type });
  } else {
    for (const child of node.children) flattenLeaves(child, out);
  }
  return out;
}
