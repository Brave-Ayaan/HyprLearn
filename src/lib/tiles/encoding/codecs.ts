export function base64Encode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
export function base64Decode(s: string): string {
  const binary = atob(s);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function urlEncode(s: string): string {
  return encodeURIComponent(s);
}
export function urlDecode(s: string): string {
  return decodeURIComponent(s);
}

export function hexEncode(s: string): string {
  return [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, "0")).join(" ");
}
export function hexDecode(s: string): string {
  const clean = s.replace(/\s+/g, "");
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) throw new Error("Invalid hex string");
  const bytes = clean.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export function caesar(s: string, shift: number): string {
  const n = ((shift % 26) + 26) % 26;
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26) + base);
  });
}

export function xorHexEncode(s: string, key: string): string {
  const bytes = new TextEncoder().encode(s);
  const keyBytes = new TextEncoder().encode(key || "\0");
  const out = [...bytes].map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return out.map((b) => b.toString(16).padStart(2, "0")).join(" ");
}
export function xorHexDecode(hex: string, key: string): string {
  const clean = hex.replace(/\s+/g, "");
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) throw new Error("Invalid hex string");
  const bytes = clean.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [];
  const keyBytes = new TextEncoder().encode(key || "\0");
  const out = bytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return new TextDecoder().decode(new Uint8Array(out));
}
