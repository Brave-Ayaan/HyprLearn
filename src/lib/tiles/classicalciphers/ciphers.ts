function shiftLetter(c: string, shift: number): string {
  if (c >= "a" && c <= "z") {
    return String.fromCharCode(((((c.charCodeAt(0) - 97 + shift) % 26) + 26) % 26) + 97);
  }
  if (c >= "A" && c <= "Z") {
    return String.fromCharCode(((((c.charCodeAt(0) - 65 + shift) % 26) + 26) % 26) + 65);
  }
  return c;
}

function cleanKey(key: string): string {
  const letters = key.replace(/[^a-zA-Z]/g, "");
  if (!letters) throw new Error("Key must contain at least one letter");
  return letters.toLowerCase();
}

function vigenereTransform(text: string, key: string, sign: 1 | -1): string {
  const k = cleanKey(key);
  let ki = 0;
  return text
    .split("")
    .map((c) => {
      if (!/[a-zA-Z]/.test(c)) return c;
      const shift = sign * (k.charCodeAt(ki % k.length) - 97);
      ki++;
      return shiftLetter(c, shift);
    })
    .join("");
}

export const vigenereEncode = (text: string, key: string) => vigenereTransform(text, key, 1);
export const vigenereDecode = (text: string, key: string) => vigenereTransform(text, key, -1);

/** Self-inverse: A<->Z, B<->Y, etc. */
export function atbash(text: string): string {
  return text
    .split("")
    .map((c) => {
      if (c >= "a" && c <= "z") return String.fromCharCode(97 + (25 - (c.charCodeAt(0) - 97)));
      if (c >= "A" && c <= "Z") return String.fromCharCode(65 + (25 - (c.charCodeAt(0) - 65)));
      return c;
    })
    .join("");
}

export function railFenceEncode(text: string, rails: number): string {
  if (rails < 2) throw new Error("Need at least 2 rails");
  const fence: string[][] = Array.from({ length: rails }, () => []);
  let row = 0;
  let dir = 1;
  for (const ch of text) {
    fence[row].push(ch);
    if (row === 0) dir = 1;
    else if (row === rails - 1) dir = -1;
    row += dir;
  }
  return fence.map((r) => r.join("")).join("");
}

export function railFenceDecode(cipher: string, rails: number): string {
  if (rails < 2) throw new Error("Need at least 2 rails");
  const n = cipher.length;
  const rowOf: number[] = [];
  let row = 0;
  let dir = 1;
  for (let i = 0; i < n; i++) {
    rowOf.push(row);
    if (row === 0) dir = 1;
    else if (row === rails - 1) dir = -1;
    row += dir;
  }
  const rowCounts = new Array(rails).fill(0);
  for (const r of rowOf) rowCounts[r]++;
  const rowStart: number[] = [];
  let acc = 0;
  for (let r = 0; r < rails; r++) {
    rowStart.push(acc);
    acc += rowCounts[r];
  }
  const rowPos = [...rowStart];
  const result: string[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const r = rowOf[i];
    result[i] = cipher[rowPos[r]];
    rowPos[r]++;
  }
  return result.join("");
}
