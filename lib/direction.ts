export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export function degreeToDirection(degree: number): Direction {
  const normalized = ((degree % 360) + 360) % 360;
  const sector = Math.floor((normalized + 22.5) / 45) % 8;
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][sector] as Direction;
}

export function getDirectionLabel(direction: string): string {
  const labels: Record<string, string> = {
    N: "正北",
    NE: "东北",
    E: "正东",
    SE: "东南",
    S: "正南",
    SW: "西南",
    W: "正西",
    NW: "西北",
  };
  return labels[direction] ?? direction;
}
