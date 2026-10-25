export class Matrix {
  rows: number;
  cols: number;
  data: number[][];

  constructor(data: number[][]) {
    this.data = data;
    this.rows = data.length;
    this.cols = data[0]?.length ?? 0;
  }

  static zeros(rows: number, cols: number): Matrix {
    return new Matrix(Array.from({ length: rows }, () => Array(cols).fill(0)));
  }

  static identity(n: number): Matrix {
    const m = Matrix.zeros(n, n);
    for (let i = 0; i < n; i++) m.data[i][i] = 1;
    return m;
  }

  clone(): Matrix {
    return new Matrix(this.data.map((r) => [...r]));
  }

  private assertSameShape(other: Matrix) {
    if (this.rows !== other.rows || this.cols !== other.cols) throw new Error("Matrix dimensions don't match");
  }

  add(other: Matrix): Matrix {
    this.assertSameShape(other);
    return new Matrix(this.data.map((row, i) => row.map((v, j) => v + other.data[i][j])));
  }

  sub(other: Matrix): Matrix {
    this.assertSameShape(other);
    return new Matrix(this.data.map((row, i) => row.map((v, j) => v - other.data[i][j])));
  }

  scale(k: number): Matrix {
    return new Matrix(this.data.map((row) => row.map((v) => v * k)));
  }

  multiply(other: Matrix): Matrix {
    if (this.cols !== other.rows) throw new Error(`Cannot multiply ${this.rows}x${this.cols} by ${other.rows}x${other.cols}`);
    const out = Matrix.zeros(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) sum += this.data[i][k] * other.data[k][j];
        out.data[i][j] = sum;
      }
    }
    return out;
  }

  transpose(): Matrix {
    const out = Matrix.zeros(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) for (let j = 0; j < this.cols; j++) out.data[j][i] = this.data[i][j];
    return out;
  }

  determinant(): number {
    if (this.rows !== this.cols) throw new Error("Determinant requires a square matrix");
    const n = this.rows;
    const m = this.clone().data;
    let det = 1;
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let row = col + 1; row < n; row++) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
      if (Math.abs(m[pivot][col]) < 1e-12) return 0;
      if (pivot !== col) {
        [m[col], m[pivot]] = [m[pivot], m[col]];
        det *= -1;
      }
      det *= m[col][col];
      for (let row = col + 1; row < n; row++) {
        const factor = m[row][col] / m[col][col];
        for (let c = col; c < n; c++) m[row][c] -= factor * m[col][c];
      }
    }
    return det;
  }

  rref(): { result: Matrix; steps: string[] } {
    const m = this.clone().data;
    const rows = this.rows;
    const cols = this.cols;
    const steps: string[] = [];
    let lead = 0;
    for (let r = 0; r < rows && lead < cols; r++) {
      let i = r;
      while (Math.abs(m[i][lead]) < 1e-12) {
        i++;
        if (i === rows) {
          i = r;
          lead++;
          if (lead === cols) return { result: new Matrix(m), steps };
        }
      }
      if (i !== r) {
        [m[i], m[r]] = [m[r], m[i]];
        steps.push(`R${r + 1} ↔ R${i + 1}`);
      }
      const lv = m[r][lead];
      if (Math.abs(lv - 1) > 1e-9) {
        m[r] = m[r].map((v) => v / lv);
        steps.push(`R${r + 1} ÷= ${lv.toFixed(3)}`);
      }
      for (let i2 = 0; i2 < rows; i2++) {
        if (i2 !== r) {
          const factor = m[i2][lead];
          if (Math.abs(factor) > 1e-9) {
            m[i2] = m[i2].map((v, c) => v - factor * m[r][c]);
            steps.push(`R${i2 + 1} -= ${factor.toFixed(3)} × R${r + 1}`);
          }
        }
      }
      lead++;
    }
    return { result: new Matrix(m), steps };
  }

  inverse(): Matrix | null {
    if (this.rows !== this.cols) throw new Error("Inverse requires a square matrix");
    const n = this.rows;
    const m = this.data.map((row, i) => [...row, ...Matrix.identity(n).data[i]]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let row = col + 1; row < n; row++) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
      if (Math.abs(m[pivot][col]) < 1e-12) return null;
      [m[col], m[pivot]] = [m[pivot], m[col]];
      const pv = m[col][col];
      m[col] = m[col].map((v) => v / pv);
      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = m[row][col];
          m[row] = m[row].map((v, c) => v - factor * m[col][c]);
        }
      }
    }
    return new Matrix(m.map((row) => row.slice(n)));
  }

  /** Unshifted QR-algorithm eigenvalue approximation; resolves complex-conjugate pairs from residual 2x2 blocks. */
  eigenvalues(iterations = 400): { re: number; im: number }[] {
    if (this.rows !== this.cols) throw new Error("Eigenvalues require a square matrix");
    const n = this.rows;
    let A = this.data.map((r) => [...r]);
    for (let iter = 0; iter < iterations; iter++) {
      const { Q, R } = qrDecompose(A);
      A = matMul(R, Q, n);
    }
    const result: { re: number; im: number }[] = [];
    let i = 0;
    while (i < n) {
      if (i === n - 1 || Math.abs(A[i + 1][i]) < 1e-6) {
        result.push({ re: A[i][i], im: 0 });
        i++;
      } else {
        const a = A[i][i];
        const b = A[i][i + 1];
        const c = A[i + 1][i];
        const d = A[i + 1][i + 1];
        const tr = a + d;
        const det = a * d - b * c;
        const disc = tr * tr - 4 * det;
        if (disc >= 0) {
          const sq = Math.sqrt(disc);
          result.push({ re: (tr + sq) / 2, im: 0 }, { re: (tr - sq) / 2, im: 0 });
        } else {
          const sq = Math.sqrt(-disc);
          result.push({ re: tr / 2, im: sq / 2 }, { re: tr / 2, im: -sq / 2 });
        }
        i += 2;
      }
    }
    return result;
  }
}

function qrDecompose(A: number[][]): { Q: number[][]; R: number[][] } {
  const n = A.length;
  const R: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const cols: number[][] = [];
  for (let j = 0; j < n; j++) {
    let v = A.map((row) => row[j]);
    for (let k = 0; k < j; k++) {
      const qk = cols[k];
      const dot = v.reduce((s, vi, i) => s + vi * qk[i], 0);
      R[k][j] = dot;
      v = v.map((vi, i) => vi - dot * qk[i]);
    }
    const norm = Math.sqrt(v.reduce((s, vi) => s + vi * vi, 0));
    R[j][j] = norm;
    cols.push(norm > 1e-12 ? v.map((vi) => vi / norm) : v.map(() => 0));
  }
  const Q = Array.from({ length: n }, (_, i) => cols.map((col) => col[i]));
  return { Q, R };
}

function matMul(X: number[][], Y: number[][], n: number): number[][] {
  const Z = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[i][k] * Y[k][j];
      Z[i][j] = s;
    }
  }
  return Z;
}

export function vectorDot(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must be the same length");
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

export function vectorCross(a: number[], b: number[]): number[] {
  if (a.length !== 3 || b.length !== 3) throw new Error("Cross product requires 3D vectors");
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function vectorNorm(a: number[]): number {
  return Math.sqrt(a.reduce((s, v) => s + v * v, 0));
}
