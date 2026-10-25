import { describe, it, expect } from "vitest";
import { theoreticalDistribution, rollOnce } from "./engine";

describe("theoreticalDistribution", () => {
  it("sums to 1 (it's a probability distribution)", () => {
    const dist = theoreticalDistribution(2, 6);
    const total = dist.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("has exactly sides*numDice - numDice + 1 entries (every possible sum)", () => {
    expect(theoreticalDistribution(2, 6)).toHaveLength(11); // sums 2..12
    expect(theoreticalDistribution(3, 6)).toHaveLength(16); // sums 3..18
  });

  it("matches the well-known 2d6 distribution (7 is most likely, at 6/36)", () => {
    const dist = theoreticalDistribution(2, 6);
    // index 5 corresponds to sum 7 (2 + 5)
    expect(dist[5]).toBeCloseTo(6 / 36, 10);
    // index 0 corresponds to sum 2 (snake eyes), 1/36
    expect(dist[0]).toBeCloseTo(1 / 36, 10);
    expect(Math.max(...dist)).toBe(dist[5]);
  });

  it("a single die is a uniform distribution", () => {
    const dist = theoreticalDistribution(1, 6);
    for (const p of dist) expect(p).toBeCloseTo(1 / 6, 10);
  });
});

describe("rollOnce", () => {
  it("stays within [numDice, numDice*sides] across many rolls", () => {
    for (let i = 0; i < 500; i++) {
      const sum = rollOnce(3, 6);
      expect(sum).toBeGreaterThanOrEqual(3);
      expect(sum).toBeLessThanOrEqual(18);
    }
  });
});
