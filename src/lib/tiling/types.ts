export type Axis = "Row" | "Column";
export type Dir = "Left" | "Right" | "Up" | "Down";
export type LayoutMode = "Bsp" | "MasterStack" | "Grid";

export type TreeNode =
  | { kind: "Leaf"; id: number; tile_type: string }
  | { kind: "Split"; axis: Axis; ratios: number[]; children: TreeNode[] };

export interface Layout {
  root: TreeNode;
  focused: number;
  mode: LayoutMode;
  fullscreen: number | null;
}
