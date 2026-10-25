export interface AlgoComplexity {
  name: string;
  category: string;
  time: string;
  space: string;
  notes: string;
}

export const algorithms: AlgoComplexity[] = [
  { name: "Array access", category: "Data structures", time: "O(1)", space: "O(1)", notes: "Direct index." },
  { name: "Array search (unsorted)", category: "Data structures", time: "O(n)", space: "O(1)", notes: "" },
  { name: "Linked list access", category: "Data structures", time: "O(n)", space: "O(1)", notes: "" },
  { name: "Linked list insert/delete (head)", category: "Data structures", time: "O(1)", space: "O(1)", notes: "" },
  { name: "Hash table average", category: "Data structures", time: "O(1)", space: "O(n)", notes: "Insert/search/delete, assuming good hash distribution." },
  { name: "Hash table worst case", category: "Data structures", time: "O(n)", space: "O(n)", notes: "All keys collide into one bucket." },
  { name: "Binary search tree average", category: "Data structures", time: "O(log n)", space: "O(n)", notes: "Insert/search/delete on a balanced-ish tree." },
  { name: "Binary search tree worst case", category: "Data structures", time: "O(n)", space: "O(n)", notes: "Degenerates to a linked list." },
  { name: "Balanced BST (AVL/Red-Black)", category: "Data structures", time: "O(log n)", space: "O(n)", notes: "Guaranteed by rebalancing." },
  { name: "Binary heap insert/extract-min", category: "Data structures", time: "O(log n)", space: "O(n)", notes: "" },

  { name: "Linear search", category: "Search", time: "O(n)", space: "O(1)", notes: "" },
  { name: "Binary search", category: "Search", time: "O(log n)", space: "O(1)", notes: "Requires sorted input." },

  { name: "Bubble sort", category: "Sorting", time: "O(n²)", space: "O(1)", notes: "" },
  { name: "Selection sort", category: "Sorting", time: "O(n²)", space: "O(1)", notes: "" },
  { name: "Insertion sort", category: "Sorting", time: "O(n²)", space: "O(1)", notes: "O(n) best case on nearly-sorted input." },
  { name: "Merge sort", category: "Sorting", time: "O(n log n)", space: "O(n)", notes: "Stable, not in-place." },
  { name: "Quicksort (average)", category: "Sorting", time: "O(n log n)", space: "O(log n)", notes: "O(n²) worst case on adversarial input." },
  { name: "Heap sort", category: "Sorting", time: "O(n log n)", space: "O(1)", notes: "In-place, not stable." },
  { name: "Counting sort", category: "Sorting", time: "O(n + k)", space: "O(k)", notes: "k: range of input values." },
  { name: "Radix sort", category: "Sorting", time: "O(d·n)", space: "O(n + k)", notes: "d: number of digits." },

  { name: "BFS / DFS (graph)", category: "Graphs", time: "O(V + E)", space: "O(V)", notes: "" },
  { name: "Dijkstra's algorithm", category: "Graphs", time: "O((V+E) log V)", space: "O(V)", notes: "With a binary heap." },
  { name: "Bellman-Ford", category: "Graphs", time: "O(V·E)", space: "O(V)", notes: "Handles negative edge weights." },
  { name: "Floyd-Warshall", category: "Graphs", time: "O(V³)", space: "O(V²)", notes: "All-pairs shortest paths." },
  { name: "Kruskal's MST", category: "Graphs", time: "O(E log E)", space: "O(V)", notes: "Sort edges + union-find." },
  { name: "Prim's MST", category: "Graphs", time: "O(E log V)", space: "O(V)", notes: "With a binary heap." },

  { name: "Fibonacci (naive recursion)", category: "Recursion", time: "O(2^n)", space: "O(n)", notes: "Stack depth, exponential blowup from repeated work." },
  { name: "Fibonacci (memoized / DP)", category: "Recursion", time: "O(n)", space: "O(n)", notes: "" },
  { name: "Power set generation", category: "Recursion", time: "O(2^n)", space: "O(2^n)", notes: "" },
  { name: "Permutations", category: "Recursion", time: "O(n!)", space: "O(n)", notes: "" },
];
