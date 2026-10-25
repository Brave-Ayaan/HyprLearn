import { describe, it, expect } from "vitest";
import { Matrix } from "./matrix";

function expectClose(m: Matrix, data: number[][], precision = 9) {
  expect(m.rows).toBe(data.length);
  expect(m.cols).toBe(data[0]?.length ?? 0);
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      expect(m.data[i][j]).toBeCloseTo(data[i][j], precision);
    }
  }
}

describe("Matrix construction", () => {
  it("identity has 1s on the diagonal and 0 elsewhere", () => {
    expectClose(Matrix.identity(3), [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });
});

describe("add/sub/scale", () => {
  const a = new Matrix([[1, 2], [3, 4]]);
  const b = new Matrix([[5, 6], [7, 8]]);

  it("adds element-wise", () => {
    expectClose(a.add(b), [[6, 8], [10, 12]]);
  });
  it("subtracts element-wise", () => {
    expectClose(a.sub(b), [[-4, -4], [-4, -4]]);
  });
  it("scales every element", () => {
    expectClose(a.scale(2), [[2, 4], [6, 8]]);
  });
  it("rejects mismatched shapes", () => {
    expect(() => a.add(new Matrix([[1, 2, 3]]))).toThrow();
  });
});

describe("multiply", () => {
  it("multiplies a 2x3 by a 3x2", () => {
    const a = new Matrix([[1, 2, 3], [4, 5, 6]]);
    const b = new Matrix([[7, 8], [9, 10], [11, 12]]);
    expectClose(a.multiply(b), [[58, 64], [139, 154]]);
  });

  it("A * identity = A", () => {
    const a = new Matrix([[1, 2], [3, 4]]);
    expectClose(a.multiply(Matrix.identity(2)), a.data);
  });

  it("rejects incompatible dimensions", () => {
    expect(() => new Matrix([[1, 2]]).multiply(new Matrix([[1, 2]]))).toThrow();
  });
});

describe("transpose", () => {
  it("flips rows and columns", () => {
    const a = new Matrix([[1, 2, 3], [4, 5, 6]]);
    expectClose(a.transpose(), [[1, 4], [2, 5], [3, 6]]);
  });
});

describe("determinant", () => {
  it("2x2 matches ad-bc", () => {
    expect(new Matrix([[1, 2], [3, 4]]).determinant()).toBeCloseTo(1 * 4 - 2 * 3, 9);
  });
  it("identity has determinant 1", () => {
    expect(Matrix.identity(4).determinant()).toBeCloseTo(1, 9);
  });
  it("a singular matrix has determinant 0", () => {
    expect(new Matrix([[1, 2], [2, 4]]).determinant()).toBeCloseTo(0, 9);
  });
  it("rejects non-square matrices", () => {
    expect(() => new Matrix([[1, 2, 3]]).determinant()).toThrow();
  });
});

describe("inverse", () => {
  it("A * A^-1 = identity", () => {
    const a = new Matrix([[4, 7], [2, 6]]);
    const inv = a.inverse();
    expect(inv).not.toBeNull();
    expectClose(a.multiply(inv!), [[1, 0], [0, 1]]);
  });
  it("returns null for a singular matrix", () => {
    expect(new Matrix([[1, 2], [2, 4]]).inverse()).toBeNull();
  });
});

describe("rref", () => {
  it("reduces a solvable system to identity on the left", () => {
    // x + 2y = 5, 3x + 4y = 6 -> solvable, unique solution
    const { result } = new Matrix([
      [1, 2, 5],
      [3, 4, 6],
    ]).rref();
    expectClose(new Matrix(result.data.map((r) => r.slice(0, 2))), [
      [1, 0],
      [0, 1],
    ]);
  });
});
