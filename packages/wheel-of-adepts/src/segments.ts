/**
 * Wheel layout shared by server (outcomes) and client (SVG).
  */

export type WheelSegmentAction = "wipe" | "swap" | "add500" | "sub500" | "noop";

export type WheelSegmentDef = {
  label: string;
  color: string;
  textColor: string;
  action: WheelSegmentAction;
};

export const WHEEL_SEGMENTS: readonly WheelSegmentDef[] = [
  { label: "ВАЙП", color: "#e74c3c", textColor: "#fff", action: "wipe" },
  { label: "-100", color: "#e67e22", textColor: "#fff", action: "noop" },
  { label: "СВАП", color: "#3498db", textColor: "#fff", action: "swap" },
  { label: "+100", color: "#2ecc71", textColor: "#fff", action: "noop" },
  { label: "Рассказать стишок", color: "#8e44ad", textColor: "#fff", action: "noop" },
  { label: "-500", color: "#c0392b", textColor: "#fff", action: "sub500" },
  { label: "ДЖЕКПОТ", color: "#f1c40f", textColor: "#2c3e50", action: "noop" },
  { label: "-300", color: "#d35400", textColor: "#fff", action: "noop" },
  { label: "+500", color: "#27ae60", textColor: "#fff", action: "add500" },
  { label: "ДЕРЖИ ВОРА", color: "#2471a3", textColor: "#fff", action: "noop" },
  { label: "+300", color: "#1abc9c", textColor: "#fff", action: "noop" },
] as const;

export const NUM_SEGMENTS = WHEEL_SEGMENTS.length;
export const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;

/** Pointer sits at 3 o'clock (same convention as Node-Script `FortuneWheel`). */
const POINTER_DEG = 90;

function normDeg(x: number): number {
  return ((x % 360) + 360) % 360;
}

/**
 * Returns new cumulative SVG rotation (deg, clockwise) so segment `winIndex`
 * settles under the fixed pointer, with several full turns for drama.
 */
export function computeNextRotation(currentRotation: number, winIndex: number): number {
  const mid = winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const sumMod = normDeg(mid + currentRotation);
  let delta = POINTER_DEG - sumMod;
  if (delta <= 0) delta += 360;
  delta += 360 * 5;
  return currentRotation + delta;
}
