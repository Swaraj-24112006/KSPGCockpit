/**
 * chartPrimitives.ts
 * ==================
 * Shared SVG chart mathematics, scales, and geometric path generators.
 * Ensures zero hardcoded SVG paths or magic pixel constants.
 */

/**
 * Calculates a clean upper bound rounded to 1, 2, 5, or 10 multiples.
 */
export const niceMax = (v: number): number => {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return mult * p;
};

/**
 * Standard circumference at radius r = 38 (approx 238.76px).
 */
export const DONUT_RADIUS = 38;
export const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS; // ~238.761

export interface DonutArc {
  len: number;
  gap: number;
  offset: number;
  pct: number;
}

/**
 * Generates exact strokeDasharray and strokeDashoffset values for donut segments.
 * All donuts rotate from 12 o'clock (-90 deg).
 */
export function donutArcs(values: number[]): DonutArc[] {
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  let acc = 0;

  return values.map(v => {
    const val = Math.max(0, v);
    const len = total > 0 ? (val / total) * DONUT_CIRCUMFERENCE : 0;
    const arc: DonutArc = {
      len,
      gap: DONUT_CIRCUMFERENCE - len,
      offset: -acc,
      pct: total > 0 ? (val / total) * 100 : 0,
    };
    acc += len;
    return arc;
  });
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Generates smooth or linear SVG path string for a sequence of points.
 */
export function buildLinePath(points: Point2D[]): string {
  if (points.length === 0) return '';
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
}

/**
 * Generates an SVG area path closed down to baselineY.
 */
export function buildAreaPath(points: Point2D[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const line = buildLinePath(points);
  return `${line} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

/**
 * Generates nice round vertical axis tick numbers for a given max value.
 */
export function generateAxisTicks(maxVal: number, tickCount: number = 4): number[] {
  const step = maxVal / tickCount;
  const ticks: number[] = [];
  for (let i = tickCount; i >= 0; i--) {
    ticks.push(Math.round(i * step));
  }
  return ticks;
}
