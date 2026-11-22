export interface TerrainLine {
  coordinates: number[][];
  width: number;
  color: string;
  zIndex: number;
}
export function isTerrainLines(value: unknown): value is TerrainLine[] {
  return (
    Array.isArray(value) &&
    value.every(
      (line) =>
        line &&
        typeof line.color === 'string' &&
        Number.isFinite(line.width) &&
        Number.isFinite(line.zIndex) &&
        Array.isArray(line.coordinates) &&
        line.coordinates.length >= 2 &&
        line.coordinates.every(
          (p: unknown) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p.every(Number.isFinite) &&
            Math.abs(p[0]) <= 180 &&
            Math.abs(p[1]) <= 90,
        ),
    )
  );
}
