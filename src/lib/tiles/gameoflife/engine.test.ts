import { describe, it, expect } from "vitest";
import { LifeGrid } from "./engine";

describe("LifeGrid", () => {
  it("toroidal get/set wraps around both axes", () => {
    const g = new LifeGrid(5, 5);
    g.set(-1, -1, true);
    expect(g.get(4, 4)).toBe(true);
    g.set(5, 5, true);
    expect(g.get(0, 0)).toBe(true);
  });

  it("a 2x2 block is a still life (unchanged by step)", () => {
    const g = new LifeGrid(10, 10);
    for (const [x, y] of [[4, 4], [5, 4], [4, 5], [5, 5]]) g.set(x, y, true);
    const next = g.step();
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        expect(next.get(x, y)).toBe(g.get(x, y));
      }
    }
  });

  it("a blinker oscillates with period 2", () => {
    const g = new LifeGrid(10, 10);
    for (const [x, y] of [[3, 5], [4, 5], [5, 5]]) g.set(x, y, true); // horizontal
    const after1 = g.step();
    expect(after1.get(4, 4)).toBe(true);
    expect(after1.get(4, 5)).toBe(true);
    expect(after1.get(4, 6)).toBe(true);
    expect(after1.get(3, 5)).toBe(false);
    const after2 = after1.step();
    expect(after2.get(3, 5)).toBe(true);
    expect(after2.get(4, 5)).toBe(true);
    expect(after2.get(5, 5)).toBe(true);
  });

  it("a lone cell dies of underpopulation", () => {
    const g = new LifeGrid(5, 5);
    g.set(2, 2, true);
    expect(g.step().liveCount()).toBe(0);
  });

  it("clear empties the grid and liveCount reflects it", () => {
    const g = new LifeGrid(5, 5);
    g.set(1, 1, true);
    g.set(2, 2, true);
    expect(g.liveCount()).toBe(2);
    g.clear();
    expect(g.liveCount()).toBe(0);
  });
});
