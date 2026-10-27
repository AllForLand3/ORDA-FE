import type { TerrainGrid } from './loadGwanakDem';
import type { CesiumTerrainApi, TerrainProvider, TerrainRectangle } from './types/vworld';

const TILE_SAMPLES = 33;
const DEGREES_EPSILON = 1e-10;

function isInsideDem(rectangle: TerrainRectangle, terrain: TerrainGrid, cesium: CesiumTerrainApi) {
  const [west, south, east, north] = terrain.bounds;

  return (
    cesium.Math.toDegrees(rectangle.west) >= west - DEGREES_EPSILON &&
    cesium.Math.toDegrees(rectangle.south) >= south - DEGREES_EPSILON &&
    cesium.Math.toDegrees(rectangle.east) <= east + DEGREES_EPSILON &&
    cesium.Math.toDegrees(rectangle.north) <= north + DEGREES_EPSILON
  );
}

function sampleElevation(terrain: TerrainGrid, longitude: number, latitude: number) {
  const [west, south, east, north] = terrain.bounds;
  const column = Math.max(
    0,
    Math.min(terrain.width - 1, ((longitude - west) / (east - west)) * (terrain.width - 1)),
  );
  const row = Math.max(
    0,
    Math.min(terrain.height - 1, ((north - latitude) / (north - south)) * (terrain.height - 1)),
  );
  const left = Math.floor(column);
  const right = Math.min(left + 1, terrain.width - 1);
  const top = Math.floor(row);
  const bottom = Math.min(top + 1, terrain.height - 1);
  const elevations = [
    terrain.elevations[top * terrain.width + left],
    terrain.elevations[top * terrain.width + right],
    terrain.elevations[bottom * terrain.width + left],
    terrain.elevations[bottom * terrain.width + right],
  ];

  if (elevations.some((elevation) => !Number.isFinite(elevation))) return null;

  const horizontal = column - left;
  const vertical = row - top;
  const northern = elevations[0] * (1 - horizontal) + elevations[1] * horizontal;
  const southern = elevations[2] * (1 - horizontal) + elevations[3] * horizontal;
  return northern * (1 - vertical) + southern * vertical;
}

function createHeightmap(
  rectangle: TerrainRectangle,
  terrain: TerrainGrid,
  cesium: CesiumTerrainApi,
) {
  const heights = new Float32Array(TILE_SAMPLES * TILE_SAMPLES);

  for (let row = 0; row < TILE_SAMPLES; row += 1) {
    const latitude = cesium.Math.toDegrees(
      rectangle.north - ((rectangle.north - rectangle.south) * row) / (TILE_SAMPLES - 1),
    );

    for (let column = 0; column < TILE_SAMPLES; column += 1) {
      const longitude = cesium.Math.toDegrees(
        rectangle.west + ((rectangle.east - rectangle.west) * column) / (TILE_SAMPLES - 1),
      );
      const elevation = sampleElevation(terrain, longitude, latitude);
      if (elevation === null) return null;
      heights[row * TILE_SAMPLES + column] = elevation;
    }
  }

  return heights;
}

export function applyGwanakDem(
  original: TerrainProvider,
  terrain: TerrainGrid,
  cesium: CesiumTerrainApi,
  onDemTile: () => void,
): TerrainProvider {
  // Preserve VWorld's terrain and availability everywhere outside the DEM coverage.
  const patched = Object.create(original) as TerrainProvider;
  const tileCache = new Map<string, Float32Array | null>();
  const demTile = (x: number, y: number, level: number) => {
    const key = `${level}/${x}/${y}`;
    if (tileCache.has(key)) return tileCache.get(key) ?? null;
    const rectangle = original.tilingScheme.tileXYToRectangle(x, y, level);
    const heights = isInsideDem(rectangle, terrain, cesium)
      ? createHeightmap(rectangle, terrain, cesium)
      : null;
    tileCache.set(key, heights);
    return heights;
  };

  patched.requestTileGeometry = (x, y, level, request) => {
    const heights = demTile(x, y, level);
    if (heights) {
      onDemTile();
      return Promise.resolve(
        new cesium.HeightmapTerrainData({
          buffer: heights,
          width: TILE_SAMPLES,
          height: TILE_SAMPLES,
          childTileMask: 15,
        }),
      );
    }

    return original.requestTileGeometry(x, y, level, request);
  };

  patched.getTileDataAvailable = (x, y, level) =>
    demTile(x, y, level) !== null ? true : original.getTileDataAvailable?.(x, y, level);

  return patched;
}
