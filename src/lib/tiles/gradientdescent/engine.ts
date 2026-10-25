export interface Point {
  x: number;
  y: number;
}

/** A simple xorshift PRNG so "random" data is reproducible across a session if ever needed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePoints(n: number, trueM: number, trueB: number, noise: number, seed = Date.now()): Point[] {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x = (rand() - 0.5) * 20;
    const y = trueM * x + trueB + (rand() - 0.5) * 2 * noise;
    points.push({ x, y });
  }
  return points;
}

export function meanSquaredError(points: Point[], m: number, b: number): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const p of points) {
    const err = m * p.x + b - p.y;
    sum += err * err;
  }
  return sum / points.length;
}

/** One batch gradient-descent step on MSE loss for y = m*x + b. */
export function gradientStep(points: Point[], m: number, b: number, lr: number): { m: number; b: number } {
  if (points.length === 0) return { m, b };
  let gradM = 0;
  let gradB = 0;
  for (const p of points) {
    const err = m * p.x + b - p.y;
    gradM += err * p.x;
    gradB += err;
  }
  const n = points.length;
  return {
    m: m - lr * ((2 * gradM) / n),
    b: b - lr * ((2 * gradB) / n),
  };
}
