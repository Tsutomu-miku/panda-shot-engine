/**
 * panda-shot-engine — Easing Functions Library
 *
 * Every function has the signature `(t: number) => number` where t is in [0, 1].
 */

// ---------------------------------------------------------------------------
// Core easing functions
// ---------------------------------------------------------------------------

export type EasingFn = (t: number) => number;

/** Clamp t to [0,1] for safety. */
function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Identity — constant velocity. */
export function linear(t: number): number {
  return clamp01(t);
}

// ---------------------------------------------------------------------------
// Quadratic
// ---------------------------------------------------------------------------

export function easeIn(t: number): number {
  t = clamp01(t);
  return t * t;
}

export function easeOut(t: number): number {
  t = clamp01(t);
  return t * (2 - t);
}

export function easeInOut(t: number): number {
  t = clamp01(t);
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ---------------------------------------------------------------------------
// Cubic Bezier (matches CSS transition-timing-function)
// ---------------------------------------------------------------------------

/**
 * Returns an easing function defined by a cubic bezier curve with control
 * points (x1, y1) and (x2, y2). The start point is always (0,0) and the
 * end point is always (1,1).
 *
 * Uses Newton's method to invert the x-polynomial so that we can evaluate
 * y = f(t) for a given x ∈ [0,1].
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): EasingFn {
  // Coefficients for the x(t) cubic polynomial
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  // Coefficients for the y(t) cubic polynomial
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t: number): number {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleCurveDerivativeX(t: number): number {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  /** Solve for the parametric t given an x value using Newton–Raphson. */
  function solveCurveX(x: number): number {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xGuess = sampleCurveX(t) - x;
      if (Math.abs(xGuess) < 1e-6) return t;
      const dx = sampleCurveDerivativeX(t);
      if (Math.abs(dx) < 1e-6) break;
      t -= xGuess / dx;
    }

    // Fall back to bisection
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const mid = sampleCurveX(t);
      if (Math.abs(mid - x) < 1e-6) return t;
      if (x > mid) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  return (x: number): number => {
    x = clamp01(x);
    if (x === 0 || x === 1) return x;
    return sampleCurveY(solveCurveX(x));
  };
}

// ---------------------------------------------------------------------------
// Bounce
// ---------------------------------------------------------------------------

export function bounce(t: number): number {
  t = clamp01(t);
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    t -= 1.5 / 2.75;
    return 7.5625 * t * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    t -= 2.25 / 2.75;
    return 7.5625 * t * t + 0.9375;
  } else {
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  }
}

// ---------------------------------------------------------------------------
// Elastic
// ---------------------------------------------------------------------------

export function elastic(t: number): number {
  t = clamp01(t);
  if (t === 0 || t === 1) return t;
  const p = 0.3;
  const s = p / 4;
  return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
}

// ---------------------------------------------------------------------------
// Registry — look up easing by name string
// ---------------------------------------------------------------------------

const EASING_MAP: Record<string, EasingFn> = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  bounce,
  elastic,
};

/**
 * Resolve an easing function from a name string.
 * Falls back to `linear` for unknown names.
 */
export function resolveEasing(name: string): EasingFn {
  return EASING_MAP[name] ?? linear;
}
