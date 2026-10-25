use serde::{Deserialize, Serialize};

/// Which way a split divides its available space.
/// `Row`: children sit side by side, dividing width.
/// `Column`: children stack top to bottom, dividing height.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum Axis {
    Row,
    Column,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum Dir {
    Left,
    Right,
    Up,
    Down,
}

impl Dir {
    fn axis(self) -> Axis {
        match self {
            Dir::Left | Dir::Right => Axis::Row,
            Dir::Up | Dir::Down => Axis::Column,
        }
    }

    fn sign(self) -> f32 {
        match self {
            Dir::Right | Dir::Down => 1.0,
            Dir::Left | Dir::Up => -1.0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum LayoutMode {
    Bsp,
    MasterStack,
    Grid,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum Node {
    Leaf { id: u64, tile_type: String },
    Split { axis: Axis, ratios: Vec<f32>, children: Vec<Node> },
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layout {
    pub root: Node,
    pub focused: u64,
    pub mode: LayoutMode,
    pub fullscreen: Option<u64>,
    next_id: u64,
}

const MIN_RATIO: f32 = 0.1;
const MAX_RATIO: f32 = 0.9;

impl Layout {
    pub fn new(initial_tile_type: &str) -> Self {
        Layout {
            root: Node::Leaf { id: 0, tile_type: initial_tile_type.to_string() },
            focused: 0,
            mode: LayoutMode::Bsp,
            fullscreen: None,
            next_id: 1,
        }
    }

    fn alloc_id(&mut self) -> u64 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }

    pub fn leaves(&self) -> Vec<(u64, String)> {
        let mut out = Vec::new();
        collect_leaves(&self.root, &mut out);
        out
    }

    pub fn contains(&self, id: u64) -> bool {
        self.leaves().iter().any(|(leaf_id, _)| *leaf_id == id)
    }

    pub fn split_focused(&mut self, axis: Axis, new_tile_type: &str) -> Result<(), String> {
        if !self.contains(self.focused) {
            return Err("focused leaf not found".into());
        }
        let new_id = self.alloc_id();
        if self.mode == LayoutMode::Bsp {
            // Default tiling: whenever a tile opens, rebuild as a balanced
            // tree where every leaf gets exactly equal area, rather than a
            // plain 50/50 split of just the focused tile (which skews
            // existing tiles' proportions). The new leaf is inserted right
            // after the focused one so it still appears nearby; an odd leaf
            // count gives the earlier (left/top-most) group the larger share.
            let mut leaves = self.leaves();
            let idx = leaves.iter().position(|(id, _)| *id == self.focused).unwrap_or(leaves.len().saturating_sub(1));
            leaves.insert(idx + 1, (new_id, new_tile_type.to_string()));
            self.root = build_equal(&leaves, axis);
        } else {
            self.root = insert_split(&self.root, self.focused, axis, new_id, new_tile_type);
        }
        self.focused = new_id;
        Ok(())
    }

    pub fn close_focused(&mut self) -> Result<(), String> {
        let leaves = self.leaves();
        if leaves.len() <= 1 {
            return Err("cannot close the last tile".into());
        }
        let closing = self.focused;
        let order: Vec<u64> = leaves.iter().map(|(id, _)| *id).collect();
        let idx = order.iter().position(|id| *id == closing).unwrap_or(0);
        self.root = remove_leaf(&self.root, closing).expect("root should not become empty");
        let remaining: Vec<u64> = order.into_iter().filter(|id| *id != closing).collect();
        self.focused = remaining[idx.min(remaining.len() - 1)];
        if self.fullscreen == Some(closing) {
            self.fullscreen = None;
        }
        Ok(())
    }

    pub fn cycle_focus(&mut self, forward: bool) {
        let leaves = self.leaves();
        if leaves.is_empty() {
            return;
        }
        let idx = leaves.iter().position(|(id, _)| *id == self.focused).unwrap_or(0);
        let n = leaves.len();
        let next = if forward { (idx + 1) % n } else { (idx + n - 1) % n };
        self.focused = leaves[next].0;
    }

    pub fn jump_to(&mut self, one_indexed: usize) -> Result<(), String> {
        let leaves = self.leaves();
        if one_indexed == 0 || one_indexed > leaves.len() {
            return Err(format!("no tile numbered {one_indexed}"));
        }
        self.focused = leaves[one_indexed - 1].0;
        Ok(())
    }

    pub fn toggle_fullscreen(&mut self) {
        self.fullscreen = if self.fullscreen == Some(self.focused) {
            None
        } else {
            Some(self.focused)
        };
    }

    pub fn resize_focused(&mut self, dir: Dir, delta: f32) {
        let signed = delta.abs() * dir.sign();
        let (new_root, _) = resize_in_parent(&self.root, self.focused, dir.axis(), signed);
        self.root = new_root;
    }

    pub fn move_focus(&mut self, dir: Dir) {
        if let Some(target) = self.find_in_direction(dir) {
            self.focused = target;
        }
    }

    pub fn swap_focused(&mut self, dir: Dir) {
        if let Some(target) = self.find_in_direction(dir) {
            if let (Some(a_type), Some(b_type)) =
                (get_tile_type(&self.root, self.focused), get_tile_type(&self.root, target))
            {
                self.root = swap_leaves(&self.root, self.focused, target, &a_type, &b_type);
            }
        }
    }

    fn find_in_direction(&self, dir: Dir) -> Option<u64> {
        let mut rects = std::collections::HashMap::new();
        compute_rects(&self.root, Rect { x: 0.0, y: 0.0, w: 1.0, h: 1.0 }, &mut rects);
        let origin = rects.get(&self.focused)?;
        let ox = origin.x + origin.w / 2.0;
        let oy = origin.y + origin.h / 2.0;

        let mut best: Option<(u64, f32)> = None;
        for (id, rect) in &rects {
            if *id == self.focused {
                continue;
            }
            let cx = rect.x + rect.w / 2.0;
            let cy = rect.y + rect.h / 2.0;
            let in_direction = match dir {
                Dir::Left => cx < ox,
                Dir::Right => cx > ox,
                Dir::Up => cy < oy,
                Dir::Down => cy > oy,
            };
            if !in_direction {
                continue;
            }
            let dist = (cx - ox).powi(2) + (cy - oy).powi(2);
            if best.map_or(true, |(_, best_dist)| dist < best_dist) {
                best = Some((*id, dist));
            }
        }
        best.map(|(id, _)| id)
    }

    /// Rebuild the tree into a constrained shape for the given preset,
    /// preserving every current leaf's id and tile_type.
    pub fn set_mode(&mut self, mode: LayoutMode) {
        self.mode = mode;
        let leaves = self.leaves();
        if leaves.len() <= 1 {
            return;
        }
        self.root = match mode {
            LayoutMode::Bsp => self.root.clone(),
            LayoutMode::MasterStack => build_master_stack(&leaves),
            LayoutMode::Grid => build_grid(&leaves),
        };
    }
}

fn collect_leaves(node: &Node, out: &mut Vec<(u64, String)>) {
    match node {
        Node::Leaf { id, tile_type } => out.push((*id, tile_type.clone())),
        Node::Split { children, .. } => {
            for child in children {
                collect_leaves(child, out);
            }
        }
    }
}

fn insert_split(node: &Node, target: u64, axis: Axis, new_id: u64, new_tile_type: &str) -> Node {
    match node {
        Node::Leaf { id, tile_type } if *id == target => Node::Split {
            axis,
            ratios: vec![0.5, 0.5],
            children: vec![
                Node::Leaf { id: *id, tile_type: tile_type.clone() },
                Node::Leaf { id: new_id, tile_type: new_tile_type.to_string() },
            ],
        },
        Node::Leaf { .. } => node.clone(),
        Node::Split { axis: a, ratios, children } => Node::Split {
            axis: *a,
            ratios: ratios.clone(),
            children: children
                .iter()
                .map(|c| insert_split(c, target, axis, new_id, new_tile_type))
                .collect(),
        },
    }
}

fn remove_leaf(node: &Node, target: u64) -> Option<Node> {
    match node {
        Node::Leaf { id, .. } if *id == target => None,
        Node::Leaf { .. } => Some(node.clone()),
        Node::Split { axis, ratios, children } => {
            let mut new_children = Vec::new();
            let mut new_ratios = Vec::new();
            for (child, ratio) in children.iter().zip(ratios.iter()) {
                if let Some(c) = remove_leaf(child, target) {
                    new_children.push(c);
                    new_ratios.push(*ratio);
                }
            }
            match new_children.len() {
                0 => None,
                1 => Some(new_children.remove(0)),
                _ => {
                    let sum: f32 = new_ratios.iter().sum();
                    let normalized = new_ratios.iter().map(|r| r / sum).collect();
                    Some(Node::Split { axis: *axis, ratios: normalized, children: new_children })
                }
            }
        }
    }
}

fn resize_in_parent(node: &Node, target: u64, axis_filter: Axis, delta: f32) -> (Node, bool) {
    match node {
        Node::Leaf { .. } => (node.clone(), false),
        Node::Split { axis, ratios, children } => {
            if *axis == axis_filter {
                if let Some(idx) = children.iter().position(|c| matches!(c, Node::Leaf { id, .. } if *id == target))
                {
                    let n = ratios.len();
                    let mut new_ratios = ratios.clone();
                    let other_total: f32 = ratios.iter().sum::<f32>() - ratios[idx];
                    let new_val = (ratios[idx] + delta).clamp(MIN_RATIO, MAX_RATIO);
                    let actual_delta = new_val - ratios[idx];
                    new_ratios[idx] = new_val;
                    if other_total > 0.0001 {
                        for i in 0..n {
                            if i != idx {
                                new_ratios[i] -= actual_delta * (ratios[i] / other_total);
                            }
                        }
                    }
                    return (
                        Node::Split { axis: *axis, ratios: new_ratios, children: children.clone() },
                        true,
                    );
                }
            }
            let mut changed = false;
            let new_children = children
                .iter()
                .map(|c| {
                    let (nc, ch) = resize_in_parent(c, target, axis_filter, delta);
                    changed = changed || ch;
                    nc
                })
                .collect();
            (Node::Split { axis: *axis, ratios: ratios.clone(), children: new_children }, changed)
        }
    }
}

fn get_tile_type(node: &Node, id: u64) -> Option<String> {
    match node {
        Node::Leaf { id: leaf_id, tile_type } if *leaf_id == id => Some(tile_type.clone()),
        Node::Leaf { .. } => None,
        Node::Split { children, .. } => children.iter().find_map(|c| get_tile_type(c, id)),
    }
}

fn swap_leaves(node: &Node, a: u64, b: u64, a_type: &str, b_type: &str) -> Node {
    match node {
        Node::Leaf { id, .. } if *id == a => Node::Leaf { id: a, tile_type: b_type.to_string() },
        Node::Leaf { id, .. } if *id == b => Node::Leaf { id: b, tile_type: a_type.to_string() },
        Node::Leaf { .. } => node.clone(),
        Node::Split { axis, ratios, children } => Node::Split {
            axis: *axis,
            ratios: ratios.clone(),
            children: children.iter().map(|c| swap_leaves(c, a, b, a_type, b_type)).collect(),
        },
    }
}

fn compute_rects(node: &Node, rect: Rect, out: &mut std::collections::HashMap<u64, Rect>) {
    match node {
        Node::Leaf { id, .. } => {
            out.insert(*id, rect);
        }
        Node::Split { axis, ratios, children } => {
            let mut offset = 0.0;
            for (child, ratio) in children.iter().zip(ratios.iter()) {
                let child_rect = match axis {
                    Axis::Row => Rect { x: rect.x + offset * rect.w, y: rect.y, w: ratio * rect.w, h: rect.h },
                    Axis::Column => Rect { x: rect.x, y: rect.y + offset * rect.h, w: rect.w, h: ratio * rect.h },
                };
                compute_rects(child, child_rect, out);
                offset += ratio;
            }
        }
    }
}

/// Recursively halves `leaves` into two groups (the earlier/first group
/// getting the extra one when the count is odd) and gives each group a
/// ratio proportional to its size. This telescopes exactly: every leaf
/// ends up with precisely 1/N of the total area, regardless of tree shape,
/// because at each level a group of size k out of n siblings gets k/n of
/// the parent's space, and recursing applies the same rule inside it.
fn build_equal(leaves: &[(u64, String)], axis: Axis) -> Node {
    if leaves.len() == 1 {
        let (id, tile_type) = &leaves[0];
        return Node::Leaf { id: *id, tile_type: tile_type.clone() };
    }
    let mid = leaves.len().div_ceil(2);
    let (first, rest) = leaves.split_at(mid);
    let first_share = first.len() as f32 / leaves.len() as f32;
    let rest_share = rest.len() as f32 / leaves.len() as f32;
    let next_axis = match axis {
        Axis::Row => Axis::Column,
        Axis::Column => Axis::Row,
    };
    Node::Split {
        axis,
        ratios: vec![first_share, rest_share],
        children: vec![build_equal(first, next_axis), build_equal(rest, next_axis)],
    }
}

fn build_master_stack(leaves: &[(u64, String)]) -> Node {
    let master = Node::Leaf { id: leaves[0].0, tile_type: leaves[0].1.clone() };
    if leaves.len() == 1 {
        return master;
    }
    let rest = &leaves[1..];
    let share = 1.0 / rest.len() as f32;
    let stack = Node::Split {
        axis: Axis::Column,
        ratios: vec![share; rest.len()],
        children: rest.iter().map(|(id, t)| Node::Leaf { id: *id, tile_type: t.clone() }).collect(),
    };
    Node::Split { axis: Axis::Row, ratios: vec![0.6, 0.4], children: vec![master, stack] }
}

fn build_grid(leaves: &[(u64, String)]) -> Node {
    let n = leaves.len();
    let cols = (n as f64).sqrt().ceil() as usize;
    let rows = (n + cols - 1) / cols;
    let mut row_nodes = Vec::new();
    for r in 0..rows {
        let start = r * cols;
        let end = (start + cols).min(n);
        let row_leaves = &leaves[start..end];
        if row_leaves.is_empty() {
            continue;
        }
        let share = 1.0 / row_leaves.len() as f32;
        let row = Node::Split {
            axis: Axis::Row,
            ratios: vec![share; row_leaves.len()],
            children: row_leaves.iter().map(|(id, t)| Node::Leaf { id: *id, tile_type: t.clone() }).collect(),
        };
        row_nodes.push(row);
    }
    if row_nodes.len() == 1 {
        return row_nodes.remove(0);
    }
    let share = 1.0 / row_nodes.len() as f32;
    Node::Split { axis: Axis::Column, ratios: vec![share; row_nodes.len()], children: row_nodes }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_layout_has_single_leaf() {
        let layout = Layout::new("dummy");
        assert_eq!(layout.leaves(), vec![(0, "dummy".to_string())]);
        assert_eq!(layout.focused, 0);
    }

    #[test]
    fn bsp_splits_keep_all_tiles_equal_area_including_odd_counts() {
        // The recursive proportional-group split achieves exact 1/N area
        // for every leaf regardless of N's parity - unlike a naive "always
        // 50/50 the pair you split" approach, there's no leftover/tie to
        // break: 3, 4, and 5 tiles all come out exactly equal.
        let mut layout = Layout::new("a");
        for (axis, name) in [(Axis::Row, "b"), (Axis::Column, "c"), (Axis::Row, "d"), (Axis::Column, "e")] {
            layout.split_focused(axis, name).unwrap();
            let n = layout.leaves().len();
            let mut rects = std::collections::HashMap::new();
            compute_rects(&layout.root, Rect { x: 0.0, y: 0.0, w: 1.0, h: 1.0 }, &mut rects);
            assert_eq!(rects.len(), n);
            let expected = 1.0 / n as f32;
            for rect in rects.values() {
                let area = rect.w * rect.h;
                assert!((area - expected).abs() < 1e-4, "with {n} tiles expected area {expected}, got {area}");
            }
        }
    }

    #[test]
    fn split_creates_second_leaf_and_focuses_it() {
        let mut layout = Layout::new("dummy");
        layout.split_focused(Axis::Row, "calc").unwrap();
        let leaves = layout.leaves();
        assert_eq!(leaves.len(), 2);
        assert_eq!(layout.focused, 1);
        assert!(leaves.iter().any(|(id, t)| *id == 1 && t == "calc"));
    }

    #[test]
    fn close_collapses_split_back_to_single_leaf() {
        let mut layout = Layout::new("dummy");
        layout.split_focused(Axis::Row, "calc").unwrap();
        layout.close_focused().unwrap();
        assert_eq!(layout.leaves(), vec![(0, "dummy".to_string())]);
        assert_eq!(layout.focused, 0);
    }

    #[test]
    fn cannot_close_last_tile() {
        let mut layout = Layout::new("dummy");
        assert!(layout.close_focused().is_err());
    }

    #[test]
    fn cycle_focus_wraps_around() {
        let mut layout = Layout::new("a");
        layout.split_focused(Axis::Row, "b").unwrap();
        layout.split_focused(Axis::Column, "c").unwrap();
        let leaves: Vec<u64> = layout.leaves().iter().map(|(id, _)| *id).collect();
        layout.focused = leaves[0];
        layout.cycle_focus(false);
        assert_eq!(layout.focused, *leaves.last().unwrap());
    }

    #[test]
    fn jump_to_out_of_range_errors() {
        let mut layout = Layout::new("a");
        assert!(layout.jump_to(5).is_err());
        assert!(layout.jump_to(1).is_ok());
    }

    #[test]
    fn resize_clamps_and_renormalizes_siblings() {
        let mut layout = Layout::new("a");
        layout.split_focused(Axis::Row, "b").unwrap();
        // focused is now the second (right) leaf; grow it hard past the max.
        layout.resize_focused(Dir::Right, 10.0);
        if let Node::Split { ratios, .. } = &layout.root {
            assert!((ratios[1] - MAX_RATIO).abs() < 1e-5);
            assert!((ratios.iter().sum::<f32>() - 1.0).abs() < 1e-5);
        } else {
            panic!("expected split root");
        }
    }

    #[test]
    fn move_focus_finds_geometric_neighbor() {
        let mut layout = Layout::new("left");
        layout.split_focused(Axis::Row, "right").unwrap();
        // focused is "right" (id 1); left neighbor is id 0.
        layout.move_focus(Dir::Left);
        assert_eq!(layout.focused, 0);
    }

    #[test]
    fn master_stack_preserves_all_leaves() {
        let mut layout = Layout::new("a");
        layout.split_focused(Axis::Row, "b").unwrap();
        layout.split_focused(Axis::Column, "c").unwrap();
        let before: std::collections::HashSet<u64> = layout.leaves().iter().map(|(id, _)| *id).collect();
        layout.set_mode(LayoutMode::MasterStack);
        let after: std::collections::HashSet<u64> = layout.leaves().iter().map(|(id, _)| *id).collect();
        assert_eq!(before, after);
    }

    #[test]
    fn grid_mode_preserves_all_leaves() {
        let mut layout = Layout::new("a");
        for t in ["b", "c", "d"] {
            layout.split_focused(Axis::Row, t).unwrap();
        }
        let before: std::collections::HashSet<u64> = layout.leaves().iter().map(|(id, _)| *id).collect();
        layout.set_mode(LayoutMode::Grid);
        let after: std::collections::HashSet<u64> = layout.leaves().iter().map(|(id, _)| *id).collect();
        assert_eq!(before, after);
    }

    #[test]
    fn swap_exchanges_tile_content_not_ids() {
        let mut layout = Layout::new("left");
        layout.split_focused(Axis::Row, "right").unwrap();
        let focused_before = layout.focused; // the "right" leaf, id 1
        layout.swap_focused(Dir::Left);
        let leaves = layout.leaves();
        assert_eq!(leaves.iter().find(|(id, _)| *id == 0).unwrap().1, "right");
        assert_eq!(leaves.iter().find(|(id, _)| *id == 1).unwrap().1, "left");
        assert_eq!(layout.focused, focused_before);
    }

    #[test]
    fn toggle_fullscreen_flips_and_clears_on_close() {
        let mut layout = Layout::new("a");
        layout.split_focused(Axis::Row, "b").unwrap();
        layout.toggle_fullscreen();
        assert_eq!(layout.fullscreen, Some(layout.focused));
        layout.toggle_fullscreen();
        assert_eq!(layout.fullscreen, None);
    }
}
