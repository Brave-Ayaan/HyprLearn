export interface Body {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  mass: number;
  color: string;
  pinned: boolean;
}

export interface SimParams {
  gravity: number; // px/s^2
  restitution: number; // 0-1, bounciness
  drag: number; // 0-1, linear damping per second
}

export function stepSimulation(bodies: Body[], width: number, height: number, dt: number, params: SimParams) {
  for (const b of bodies) {
    if (b.pinned) continue;
    b.vy += params.gravity * dt;
    const damp = Math.max(0, 1 - params.drag * dt);
    b.vx *= damp;
    b.vy *= damp;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx = -b.vx * params.restitution;
    }
    if (b.x + b.r > width) {
      b.x = width - b.r;
      b.vx = -b.vx * params.restitution;
    }
    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy = -b.vy * params.restitution;
    }
    if (b.y + b.r > height) {
      b.y = height - b.r;
      b.vy = -b.vy * params.restitution;
    }
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      resolveCollision(bodies[i], bodies[j], params.restitution);
    }
  }
}

/** Elastic collision between two circles: positional de-overlap + impulse along the contact normal. */
function resolveCollision(a: Body, b: Body, restitution: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.r + b.r;
  if (dist === 0 || dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;
  const aFixed = a.pinned;
  const bFixed = b.pinned;

  if (!aFixed && !bFixed) {
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;
  } else if (!aFixed) {
    a.x -= nx * overlap;
    a.y -= ny * overlap;
  } else if (!bFixed) {
    b.x += nx * overlap;
    b.y += ny * overlap;
  }

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return;

  const invMassA = aFixed ? 0 : 1 / a.mass;
  const invMassB = bFixed ? 0 : 1 / b.mass;
  if (invMassA + invMassB === 0) return;

  const j = (-(1 + restitution) * velAlongNormal) / (invMassA + invMassB);
  const ix = j * nx;
  const iy = j * ny;
  a.vx -= ix * invMassA;
  a.vy -= iy * invMassA;
  b.vx += ix * invMassB;
  b.vy += iy * invMassB;
}

const PALETTE = ["#61afef", "#98c379", "#e5c07b", "#e06c75", "#c678dd", "#56b6c2"];

export function makeBody(id: number, x: number, y: number): Body {
  const r = 12 + Math.random() * 10;
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    r,
    mass: r * r * 0.02,
    color: PALETTE[id % PALETTE.length],
    pinned: true, // starts pinned so the initial click-drag can fling it
  };
}
