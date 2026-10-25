export type Base = 2 | 8 | 10 | 16;
export type BitWidth = 8 | 16 | 32 | 64;
export type BitwiseOp = "and" | "or" | "xor" | "not" | "shl" | "shr";

const DIGITS_BY_BASE: Record<Base, string> = {
  2: "01",
  8: "01234567",
  10: "0123456789",
  16: "0123456789abcdef",
};

export function isValidDigit(ch: string, base: Base): boolean {
  return ch.length === 1 && DIGITS_BY_BASE[base].includes(ch.toLowerCase());
}

export function maskToWidth(value: bigint, bits: BitWidth): bigint {
  const modulus = 1n << BigInt(bits);
  let v = value % modulus;
  if (v < 0n) v += modulus;
  return v;
}

export function toSigned(value: bigint, bits: BitWidth): bigint {
  const masked = maskToWidth(value, bits);
  const signBit = 1n << BigInt(bits - 1);
  return masked >= signBit ? masked - (1n << BigInt(bits)) : masked;
}

export function parseInBase(text: string, base: Base): bigint {
  const clean = text.trim().toLowerCase();
  if (!clean) return 0n;
  let negative = false;
  let body = clean;
  if (body.startsWith("-")) {
    negative = true;
    body = body.slice(1);
  }
  if (!body.length || [...body].some((c) => !isValidDigit(c, base))) {
    throw new Error(`Invalid digit for base ${base}`);
  }
  const digits = DIGITS_BY_BASE[base];
  const b = BigInt(base);
  let value = 0n;
  for (const c of body) {
    value = value * b + BigInt(digits.indexOf(c));
  }
  return negative ? -value : value;
}

export function formatInBase(value: bigint, base: Base, bits: BitWidth): string {
  const masked = maskToWidth(value, bits);
  if (masked === 0n) return "0";
  const digits = DIGITS_BY_BASE[base];
  const b = BigInt(base);
  let v = masked;
  let out = "";
  while (v > 0n) {
    out = digits[Number(v % b)] + out;
    v /= b;
  }
  return out;
}

export function applyBitwise(op: BitwiseOp, a: bigint, b: bigint, bits: BitWidth): bigint {
  const ma = maskToWidth(a, bits);
  const mb = maskToWidth(b, bits);
  switch (op) {
    case "and":
      return maskToWidth(ma & mb, bits);
    case "or":
      return maskToWidth(ma | mb, bits);
    case "xor":
      return maskToWidth(ma ^ mb, bits);
    case "not":
      return maskToWidth(~ma, bits);
    case "shl":
      return maskToWidth(ma << mb, bits);
    case "shr":
      return maskToWidth(ma >> mb, bits);
  }
}
