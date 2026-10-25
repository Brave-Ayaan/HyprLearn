export class LifeGrid {
  cols: number;
  rows: number;
  cells: Uint8Array;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Uint8Array(cols * rows);
  }

  idx(x: number, y: number): number {
    const wx = ((x % this.cols) + this.cols) % this.cols;
    const wy = ((y % this.rows) + this.rows) % this.rows;
    return wy * this.cols + wx;
  }

  get(x: number, y: number): boolean {
    return this.cells[this.idx(x, y)] === 1;
  }

  set(x: number, y: number, alive: boolean) {
    this.cells[this.idx(x, y)] = alive ? 1 : 0;
  }

  toggle(x: number, y: number) {
    const i = this.idx(x, y);
    this.cells[i] = this.cells[i] ? 0 : 1;
  }

  randomize(density = 0.25) {
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = Math.random() < density ? 1 : 0;
  }

  clear() {
    this.cells.fill(0);
  }

  liveCount(): number {
    let n = 0;
    for (const c of this.cells) n += c;
    return n;
  }

  /** Standard Conway rules (B3/S23), toroidal (wraparound) edges. */
  step(): LifeGrid {
    const next = new LifeGrid(this.cols, this.rows);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (this.get(x + dx, y + dy)) neighbors++;
          }
        }
        const alive = this.get(x, y);
        next.set(x, y, alive ? neighbors === 2 || neighbors === 3 : neighbors === 3);
      }
    }
    return next;
  }
}
