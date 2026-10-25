import { describe, it, expect } from "vitest";
import { generatePoints, meanSquaredError, gradientStep, type Point } from "./engine";

describe("meanSquaredError", () => {
  it("is 0 for a perfect fit", () => {
    const points: Point[] = [{ x: 0, y: 2 }, { x: 1, y: 5 }, { x: 2, y: 8 }]; // y = 3x + 2
    expect(meanSquaredError(points, 3, 2)).toBeCloseTo(0, 10);
  });

  it("is the average squared residual otherwise", () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }]; // fit y = 0
    // errors with m=0,b=1: (0-0+1)=1, (0-0+1)=1 -> mse = (1+1)/2 = 1
    expect(meanSquaredError(points, 0, 1)).toBeCloseTo(1, 10);
  });
});

describe("gradientStep", () => {
  it("matches a hand-computed single step exactly", () => {
    // points ~ y = 3x; starting from m=0, b=0, lr=0.1:
    // err = [0, -3, -6], gradM = -15, gradB = -9, n = 3
    // m' = 0 - 0.1*(2*-15/3) = 1.0, b' = 0 - 0.1*(2*-9/3) = 0.6
    const points: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 6 }];
    const { m, b } = gradientStep(points, 0, 0, 0.1);
    expect(m).toBeCloseTo(1.0, 9);
    expect(b).toBeCloseTo(0.6, 9);
  });

  it("strictly reduces loss over many steps at a conservative learning rate", () => {
    const points: Point[] = Array.from({ length: 20 }, (_, i) => ({ x: i - 10, y: 2 * (i - 10) + 5 }));
    let m = 0;
    let b = 0;
    let prevLoss = meanSquaredError(points, m, b);
    for (let i = 0; i < 200; i++) {
      ({ m, b } = gradientStep(points, m, b, 0.001));
      const loss = meanSquaredError(points, m, b);
      expect(loss).toBeLessThanOrEqual(prevLoss + 1e-9);
      prevLoss = loss;
    }
    expect(prevLoss).toBeLessThan(meanSquaredError(points, 0, 0));
  });

  it("is a no-op on an empty dataset", () => {
    expect(gradientStep([], 1, 2, 0.1)).toEqual({ m: 1, b: 2 });
  });
});

describe("generatePoints", () => {
  it("generates the requested count, deterministically for a given seed", () => {
    const a = generatePoints(10, 1, 0, 1, 42);
    const b = generatePoints(10, 1, 0, 1, 42);
    expect(a).toHaveLength(10);
    expect(a).toEqual(b);
  });
});
