type TokenType = "num" | "ident" | "op" | "lparen" | "rparen" | "comma" | "end";
interface Token {
  type: TokenType;
  value: string;
}

export type AngleMode = "rad" | "deg";

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  min: Math.min,
  max: Math.max,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const TRIG = new Set(["sin", "cos", "tan"]);
const INVERSE_TRIG = new Set(["asin", "acos", "atan"]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      if (input[j] === "e" || input[j] === "E") {
        let k = j + 1;
        if (input[k] === "+" || input[k] === "-") k++;
        if (/[0-9]/.test(input[k])) {
          while (k < input.length && /[0-9]/.test(input[k])) k++;
          j = k;
        }
      }
      tokens.push({ type: "num", value: input.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < input.length && /[a-zA-Z_0-9]/.test(input[j])) j++;
      tokens.push({ type: "ident", value: input.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/%^".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen", value: c });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: c });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "comma", value: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${c}'`);
  }
  tokens.push({ type: "end", value: "" });
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private angleMode: AngleMode,
  ) {}

  parse(): number {
    const value = this.parseExpr();
    if (this.peek().type !== "end") throw new Error(`Unexpected token '${this.peek().value}'`);
    return value;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private parseExpr(): number {
    let value = this.parseTerm();
    while (this.peek().type === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value;
      const rhs = this.parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseUnary();
    while (this.peek().type === "op" && ["*", "/", "%"].includes(this.peek().value)) {
      const op = this.next().value;
      const rhs = this.parseUnary();
      if (op === "*") value *= rhs;
      else if (op === "/") {
        if (rhs === 0) throw new Error("Division by zero");
        value /= rhs;
      } else value %= rhs;
    }
    return value;
  }

  private parseUnary(): number {
    if (this.peek().type === "op" && this.peek().value === "-") {
      this.next();
      return -this.parseUnary();
    }
    if (this.peek().type === "op" && this.peek().value === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    if (this.peek().type === "op" && this.peek().value === "^") {
      this.next();
      const exp = this.parseUnary();
      return Math.pow(base, exp);
    }
    return base;
  }

  private parsePrimary(): number {
    const tok = this.peek();
    if (tok.type === "num") {
      this.next();
      return parseFloat(tok.value);
    }
    if (tok.type === "lparen") {
      this.next();
      const value = this.parseExpr();
      if (this.peek().type !== "rparen") throw new Error("Expected ')'");
      this.next();
      return value;
    }
    if (tok.type === "ident") {
      this.next();
      const name = tok.value.toLowerCase();
      if (this.peek().type === "lparen") {
        this.next();
        const args: number[] = [];
        if (this.peek().type !== "rparen") {
          args.push(this.parseExpr());
          while (this.peek().type === "comma") {
            this.next();
            args.push(this.parseExpr());
          }
        }
        if (this.peek().type !== "rparen") throw new Error("Expected ')'");
        this.next();
        const fn = FUNCTIONS[name];
        if (!fn) throw new Error(`Unknown function '${name}'`);
        return this.applyAngle(name, fn, args);
      }
      if (name in CONSTANTS) return CONSTANTS[name];
      throw new Error(`Unknown identifier '${name}'`);
    }
    throw new Error(`Unexpected token '${tok.value}'`);
  }

  private applyAngle(name: string, fn: (...a: number[]) => number, args: number[]): number {
    if (this.angleMode === "deg" && TRIG.has(name)) {
      return fn((args[0] * Math.PI) / 180);
    }
    const result = fn(...args);
    if (this.angleMode === "deg" && INVERSE_TRIG.has(name)) {
      return (result * 180) / Math.PI;
    }
    return result;
  }
}

export function evaluate(expr: string, angleMode: AngleMode = "rad"): number {
  const tokens = tokenize(expr);
  const result = new Parser(tokens, angleMode).parse();
  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return result;
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
  return parseFloat(n.toPrecision(12)).toString();
}
