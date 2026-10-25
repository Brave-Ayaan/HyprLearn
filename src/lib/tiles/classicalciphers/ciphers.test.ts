import { describe, it, expect } from "vitest";
import { vigenereEncode, vigenereDecode, atbash, railFenceEncode, railFenceDecode } from "./ciphers";

describe("vigenere", () => {
  it("matches the textbook example (LEMON / ATTACKATDAWN -> LXFOPVEFRNHR)", () => {
    expect(vigenereEncode("ATTACKATDAWN", "LEMON")).toBe("LXFOPVEFRNHR");
  });

  it("round-trips arbitrary text, preserving case and punctuation", () => {
    const text = "Attack at dawn, Mr. Smith!";
    const key = "lemon";
    expect(vigenereDecode(vigenereEncode(text, key), key)).toBe(text);
  });

  it("rejects a key with no letters", () => {
    expect(() => vigenereEncode("hello", "123")).toThrow();
  });
});

describe("atbash", () => {
  it("maps A<->Z and preserves case", () => {
    expect(atbash("Az")).toBe("Za");
  });

  it("is its own inverse", () => {
    const text = "The Quick Brown Fox!";
    expect(atbash(atbash(text))).toBe(text);
  });

  it("leaves non-letters untouched", () => {
    expect(atbash("a1 b2!")).toBe("z1 y2!");
  });
});

describe("rail fence", () => {
  it("matches the textbook 3-rail example", () => {
    expect(railFenceEncode("WEAREDISCOVEREDFLEEATONCE", 3)).toBe("WECRLTEERDSOEEFEAOCAIVDEN");
  });

  it("round-trips for a range of rail counts and lengths", () => {
    const text = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG";
    for (const rails of [2, 3, 4, 5, 7, 10]) {
      expect(railFenceDecode(railFenceEncode(text, rails), rails)).toBe(text);
    }
  });

  it("rejects fewer than 2 rails", () => {
    expect(() => railFenceEncode("hi", 1)).toThrow();
  });
});
