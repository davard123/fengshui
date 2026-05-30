import type { Direction } from "./types";

// Each direction covers 45 degrees, centered on the cardinal/intercardinal point.
// North spans 337.5-360 and 0-22.5 to handle the wrap around 0 degrees.
const DIRECTION_RANGES: { dir: Direction; min: number; max: number }[] = [
  { dir: "N", min: 337.5, max: 360 },
  { dir: "N", min: 0, max: 22.5 },
  { dir: "NE", min: 22.5, max: 67.5 },
  { dir: "E", min: 67.5, max: 112.5 },
  { dir: "SE", min: 112.5, max: 157.5 },
  { dir: "S", min: 157.5, max: 202.5 },
  { dir: "SW", min: 202.5, max: 247.5 },
  { dir: "W", min: 247.5, max: 292.5 },
  { dir: "NW", min: 292.5, max: 337.5 },
];

// Facing degree (0 = magnetic north) to eight-direction label.
export function degreeToDirection(degree: number): Direction {
  const normalized = ((degree % 360) + 360) % 360;
  for (const { dir, min, max } of DIRECTION_RANGES) {
    if (normalized >= min && normalized < max) return dir;
  }
  return "N";
}

// Opposite direction for the sitting mountain.
const OPPOSITE: Record<Direction, Direction> = {
  N: "S",
  NE: "SW",
  E: "W",
  SE: "NW",
  S: "N",
  SW: "NE",
  W: "E",
  NW: "SE",
};

export function oppositeDirection(dir: Direction): Direction {
  return OPPOSITE[dir];
}

// Keep the misspelled export as a compatibility alias for any in-flight AI 2 code.
export const oppositDirection = oppositeDirection;

const CHINESE: Record<Direction, string> = {
  N: "正北",
  NE: "东北",
  E: "正东",
  SE: "东南",
  S: "正南",
  SW: "西南",
  W: "正西",
  NW: "西北",
};

export function directionToChinese(dir: Direction): string {
  return CHINESE[dir];
}

// Returns true when the last N readings are all within 5 degrees of each other.
export function isFacingStable(readings: number[], windowSize = 3): boolean {
  if (readings.length < windowSize) return false;
  const recent = readings.slice(-windowSize);
  const max = Math.max(...recent);
  const min = Math.min(...recent);
  const diff = Math.min(max - min, 360 - (max - min));
  return diff < 5;
}
