export type Expr =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "add"; a: Expr; b: Expr }
  | { t: "sub"; a: Expr; b: Expr }
  | { t: "mul"; a: Expr; b: Expr }
  | { t: "div"; a: Expr; b: Expr }
  | { t: "pow"; a: Expr; b: Expr }
  | { t: "neg"; a: Expr }
  | { t: "call"; name: string; args: Expr[] };

const num = (v: number): Expr => ({ t: "num", v });

export const FUNCTIONS: Record<string, (...a: number[]) => number> = {
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

// --- Tokenizer -----------------------------------------------------------

type TokenType = "num" | "ident" | "op" | "lparen" | "rparen" | "comma" | "end";
interface Token {
  type: TokenType;
  value: string;
}

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

// --- Parser (recursive descent, builds an AST rather than evaluating) ---
// Supports implicit multiplication ("2x", "2(x+1)", "x(x+1)") by treating
// adjacent tokens with no operator between them as a '*' join.

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): Expr {
    const e = this.parseExpr();
    if (this.peek().type !== "end") throw new Error(`Unexpected token '${this.peek().value}'`);
    return e;
  }

  private peek() {
    return this.tokens[this.pos];
  }
  private next() {
    return this.tokens[this.pos++];
  }

  private parseExpr(): Expr {
    let value = this.parseTerm();
    while (this.peek().type === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value;
      const rhs = this.parseTerm();
      value = op === "+" ? { t: "add", a: value, b: rhs } : { t: "sub", a: value, b: rhs };
    }
    return value;
  }

  private startsImplicitFactor(): boolean {
    const tok = this.peek();
    return tok.type === "num" || tok.type === "ident" || tok.type === "lparen";
  }

  private parseTerm(): Expr {
    let value = this.parseUnary();
    while (true) {
      if (this.peek().type === "op" && (this.peek().value === "*" || this.peek().value === "/" || this.peek().value === "%")) {
        const op = this.next().value;
        const rhs = this.parseUnary();
        value = op === "*" ? { t: "mul", a: value, b: rhs } : op === "/" ? { t: "div", a: value, b: rhs } : { t: "call", name: "mod", args: [value, rhs] };
      } else if (this.startsImplicitFactor()) {
        const rhs = this.parseUnary();
        value = { t: "mul", a: value, b: rhs };
      } else {
        break;
      }
    }
    return value;
  }

  private parseUnary(): Expr {
    if (this.peek().type === "op" && this.peek().value === "-") {
      this.next();
      return { t: "neg", a: this.parseUnary() };
    }
    if (this.peek().type === "op" && this.peek().value === "+") {
      this.next();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Expr {
    const base = this.parsePrimary();
    if (this.peek().type === "op" && this.peek().value === "^") {
      this.next();
      const exp = this.parseUnary();
      return { t: "pow", a: base, b: exp };
    }
    return base;
  }

  private parsePrimary(): Expr {
    const tok = this.peek();
    if (tok.type === "num") {
      this.next();
      return num(parseFloat(tok.value));
    }
    if (tok.type === "lparen") {
      this.next();
      const e = this.parseExpr();
      if (this.peek().type !== "rparen") throw new Error("Expected ')'");
      this.next();
      return e;
    }
    if (tok.type === "ident") {
      this.next();
      const name = tok.value.toLowerCase();
      if (this.peek().type === "lparen") {
        this.next();
        const args: Expr[] = [];
        if (this.peek().type !== "rparen") {
          args.push(this.parseExpr());
          while (this.peek().type === "comma") {
            this.next();
            args.push(this.parseExpr());
          }
        }
        if (this.peek().type !== "rparen") throw new Error("Expected ')'");
        this.next();
        return { t: "call", name, args };
      }
      return { t: "var", name };
    }
    throw new Error(`Unexpected token '${tok.value}'`);
  }
}

export function parse(input: string): Expr {
  return new Parser(tokenize(input)).parse();
}

// --- Evaluation ------------------------------------------------------------

export function evaluate(expr: Expr, env: Record<string, number> = {}): number {
  switch (expr.t) {
    case "num":
      return expr.v;
    case "var":
      if (expr.name in env) return env[expr.name];
      if (expr.name in CONSTANTS) return CONSTANTS[expr.name];
      throw new Error(`Unknown variable '${expr.name}'`);
    case "add":
      return evaluate(expr.a, env) + evaluate(expr.b, env);
    case "sub":
      return evaluate(expr.a, env) - evaluate(expr.b, env);
    case "mul":
      return evaluate(expr.a, env) * evaluate(expr.b, env);
    case "div":
      return evaluate(expr.a, env) / evaluate(expr.b, env);
    case "pow":
      return Math.pow(evaluate(expr.a, env), evaluate(expr.b, env));
    case "neg":
      return -evaluate(expr.a, env);
    case "call": {
      if (expr.name === "mod") return evaluate(expr.args[0], env) % evaluate(expr.args[1], env);
      const fn = FUNCTIONS[expr.name];
      if (!fn) throw new Error(`Unknown function '${expr.name}'`);
      return fn(...expr.args.map((a) => evaluate(a, env)));
    }
  }
}

export function freeVars(expr: Expr, out: Set<string> = new Set()): Set<string> {
  switch (expr.t) {
    case "num":
      return out;
    case "var":
      if (!(expr.name in CONSTANTS)) out.add(expr.name);
      return out;
    case "neg":
      return freeVars(expr.a, out);
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "pow":
      freeVars(expr.a, out);
      freeVars(expr.b, out);
      return out;
    case "call":
      for (const a of expr.args) freeVars(a, out);
      return out;
  }
}

// --- Simplification (bottom-up constant folding + identity rules) --------

export function simplify(expr: Expr): Expr {
  if (expr.t === "num" || expr.t === "var") return expr;
  if (expr.t === "neg") {
    const a = simplify(expr.a);
    if (a.t === "num") return num(-a.v);
    if (a.t === "neg") return a.a;
    return { t: "neg", a };
  }
  if (expr.t === "call") {
    const args = expr.args.map(simplify);
    if (args.every((a) => a.t === "num")) {
      try {
        return num(evaluate({ ...expr, args }));
      } catch {
        // fall through unevaluated (e.g. domain error)
      }
    }
    return { t: "call", name: expr.name, args };
  }

  const a = simplify(expr.a);
  const b = simplify(expr.b);
  const isZero = (e: Expr) => e.t === "num" && e.v === 0;
  const isOne = (e: Expr) => e.t === "num" && e.v === 1;

  if (a.t === "num" && b.t === "num") {
    switch (expr.t) {
      case "add":
        return num(a.v + b.v);
      case "sub":
        return num(a.v - b.v);
      case "mul":
        return num(a.v * b.v);
      case "div":
        return num(a.v / b.v);
      case "pow":
        return num(Math.pow(a.v, b.v));
    }
  }

  switch (expr.t) {
    case "add":
      if (isZero(a)) return b;
      if (isZero(b)) return a;
      return { t: "add", a, b };
    case "sub":
      if (isZero(b)) return a;
      if (isZero(a)) return simplify({ t: "neg", a: b });
      return { t: "sub", a, b };
    case "mul":
      if (isZero(a) || isZero(b)) return num(0);
      if (isOne(a)) return b;
      if (isOne(b)) return a;
      return { t: "mul", a, b };
    case "div":
      if (isZero(a)) return num(0);
      if (isOne(b)) return a;
      return { t: "div", a, b };
    case "pow":
      if (isZero(b)) return num(1);
      if (isOne(b)) return a;
      if (isOne(a)) return num(1);
      return { t: "pow", a, b };
  }
}

// --- Symbolic differentiation ---------------------------------------------

export function derivative(expr: Expr, wrt: string): Expr {
  const d = (e: Expr): Expr => derivative(e, wrt);
  switch (expr.t) {
    case "num":
      return num(0);
    case "var":
      return num(expr.name === wrt ? 1 : 0);
    case "neg":
      return { t: "neg", a: d(expr.a) };
    case "add":
      return { t: "add", a: d(expr.a), b: d(expr.b) };
    case "sub":
      return { t: "sub", a: d(expr.a), b: d(expr.b) };
    case "mul":
      // product rule: (uv)' = u'v + uv'
      return { t: "add", a: { t: "mul", a: d(expr.a), b: expr.b }, b: { t: "mul", a: expr.a, b: d(expr.b) } };
    case "div": {
      // quotient rule: (u/v)' = (u'v - uv') / v^2
      const numerator: Expr = {
        t: "sub",
        a: { t: "mul", a: d(expr.a), b: expr.b },
        b: { t: "mul", a: expr.a, b: d(expr.b) },
      };
      return { t: "div", a: numerator, b: { t: "pow", a: expr.b, b: num(2) } };
    }
    case "pow": {
      const { a: base, b: exp } = expr;
      const baseHasVar = freeVars(base).has(wrt);
      const expHasVar = freeVars(exp).has(wrt);
      if (!expHasVar) {
        // power rule: (u^n)' = n * u^(n-1) * u'
        return { t: "mul", a: { t: "mul", a: exp, b: { t: "pow", a: base, b: { t: "sub", a: exp, b: num(1) } } }, b: d(base) };
      }
      if (!baseHasVar) {
        // (a^v)' = a^v * ln(a) * v'
        return { t: "mul", a: { t: "mul", a: expr, b: { t: "call", name: "ln", args: [base] } }, b: d(exp) };
      }
      // general case: (u^v)' = u^v * (v' * ln(u) + v * u'/u)
      return {
        t: "mul",
        a: expr,
        b: { t: "add", a: { t: "mul", a: d(exp), b: { t: "call", name: "ln", args: [base] } }, b: { t: "mul", a: exp, b: { t: "div", a: d(base), b: base } } },
      };
    }
    case "call": {
      const [u] = expr.args;
      const du = u ? d(u) : num(0);
      const chain = (inner: Expr): Expr => ({ t: "mul", a: inner, b: du });
      switch (expr.name) {
        case "sin":
          return chain({ t: "call", name: "cos", args: [u] });
        case "cos":
          return chain({ t: "neg", a: { t: "call", name: "sin", args: [u] } });
        case "tan":
          return chain({ t: "div", a: num(1), b: { t: "pow", a: { t: "call", name: "cos", args: [u] }, b: num(2) } });
        case "exp":
          return chain({ t: "call", name: "exp", args: [u] });
        case "ln":
          return chain({ t: "div", a: num(1), b: u });
        case "log":
          return chain({ t: "div", a: num(1), b: { t: "mul", a: u, b: { t: "call", name: "ln", args: [num(10)] } } });
        case "sqrt":
          return chain({ t: "div", a: num(1), b: { t: "mul", a: num(2), b: { t: "call", name: "sqrt", args: [u] } } });
        case "asin":
          return chain({ t: "div", a: num(1), b: { t: "call", name: "sqrt", args: [{ t: "sub", a: num(1), b: { t: "pow", a: u, b: num(2) } }] } });
        case "acos":
          return chain({ t: "neg", a: { t: "div", a: num(1), b: { t: "call", name: "sqrt", args: [{ t: "sub", a: num(1), b: { t: "pow", a: u, b: num(2) } }] } } });
        case "atan":
          return chain({ t: "div", a: num(1), b: { t: "add", a: num(1), b: { t: "pow", a: u, b: num(2) } } });
        case "abs":
          return chain({ t: "div", a: u, b: { t: "call", name: "abs", args: [u] } });
        default:
          throw new Error(`Don't know how to differentiate '${expr.name}'`);
      }
    }
  }
}

// --- LaTeX rendering --------------------------------------------------------

const GREEK = new Set(["theta", "alpha", "beta", "gamma", "delta", "omega", "phi", "lambda", "mu", "sigma", "pi"]);

function varLatex(name: string): string {
  if (name === "pi") return "\\pi";
  if (GREEK.has(name)) return `\\${name}`;
  return name.length > 1 ? `\\mathrm{${name}}` : name;
}

function needsParens(child: Expr, parentPrec: number): boolean {
  return precedence(child) < parentPrec;
}

function precedence(e: Expr): number {
  switch (e.t) {
    case "add":
    case "sub":
      return 1;
    case "mul":
    case "div":
      return 2;
    case "neg":
      return 3;
    case "pow":
      return 4;
    default:
      return 10;
  }
}

export function toLatex(expr: Expr): string {
  switch (expr.t) {
    case "num":
      return Number.isInteger(expr.v) ? expr.v.toString() : expr.v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    case "var":
      return varLatex(expr.name);
    case "neg":
      return `-${wrap(expr.a, precedence(expr))}`;
    case "add":
      return `${toLatex(expr.a)} + ${toLatex(expr.b)}`;
    case "sub":
      return `${toLatex(expr.a)} - ${wrap(expr.b, 1.5)}`;
    case "mul":
      return `${wrap(expr.a, 2)} \\cdot ${wrap(expr.b, 2)}`;
    case "div":
      return `\\frac{${toLatex(expr.a)}}{${toLatex(expr.b)}}`;
    case "pow":
      return `${wrap(expr.a, 5)}^{${toLatex(expr.b)}}`;
    case "call": {
      const argsLatex = expr.args.map(toLatex).join(", ");
      if (expr.name === "sqrt") return `\\sqrt{${argsLatex}}`;
      return `\\operatorname{${expr.name}}(${argsLatex})`;
    }
  }
}

function wrap(e: Expr, parentPrec: number): string {
  const s = toLatex(e);
  return needsParens(e, parentPrec) ? `\\left(${s}\\right)` : s;
}

// --- Numeric root-finding and integration (no symbolic solve/integral) ---

export function findRoots(fn: (x: number) => number, xMin: number, xMax: number, samples = 400): number[] {
  const roots: number[] = [];
  const step = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = safe(fn, prevX);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const y = safe(fn, x);
    if (prevY !== null && y !== null) {
      if (prevY === 0) roots.push(prevX);
      else if (prevY * y < 0) roots.push(bisect(fn, prevX, x));
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}

function safe(fn: (x: number) => number, x: number): number | null {
  try {
    const y = fn(x);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

function bisect(fn: (x: number) => number, a: number, b: number, iters = 60): number {
  let lo = a;
  let hi = b;
  let fLo = fn(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fMid = fn(mid);
    if (fLo * fMid <= 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

export function integrate(fn: (x: number) => number, a: number, b: number, n = 1000): number {
  if (n % 2 !== 0) n++;
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    sum += fn(a + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (h / 3) * sum;
}
