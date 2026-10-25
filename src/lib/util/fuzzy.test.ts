import { describe, it, expect } from "vitest";
import { fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("matches a subsequence in order", () => {
    expect(fuzzyScore("tc", "tile.close")).toBeGreaterThanOrEqual(0);
  });

  it("returns -1 when the query isn't a subsequence", () => {
    expect(fuzzyScore("zzz", "tile.close")).toBe(-1);
  });

  it("empty query matches everything with score 0", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });

  it("an exact substring match always outranks a scattered subsequence match", () => {
    // Regression test: "help" used to score higher against
    // "tile.open.classicalciphers open classical ciphers" (greedy picks
    // the adjacent h+e inside "ciphers") than against hyprlearn's actual
    // literal "Help" substring - see HyprLearn.svelte's help docs.
    const hyprlearn = "tile.open.hyprlearn open hyprlearn (help & tutorial)";
    const ciphers = "tile.open.classicalciphers open classical ciphers";
    expect(fuzzyScore("help", hyprlearn)).toBeGreaterThan(fuzzyScore("help", ciphers));
  });

  it("an earlier substring match scores higher than a later one", () => {
    expect(fuzzyScore("cat", "cat food")).toBeGreaterThan(fuzzyScore("cat", "a wildcat"));
  });

  it("rewards consecutive subsequence matches over scattered ones", () => {
    const tight = fuzzyScore("ab", "ab");
    const loose = fuzzyScore("ab", "a_b");
    expect(tight).toBeGreaterThan(loose);
  });
});
