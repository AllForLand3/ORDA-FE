import { fromUrl } from 'geotiff';

const DEM_URL = `${import.meta.env.BASE_URL}dem/Copernicus_DSM_COG_10_N37_00_E126_00_DEM.tif`;

// EPSG:4326, [west, south, east, north]. Keep the sample inside the N37E126 tile.
export const GWANAK_BOUNDS = [126.925, 37.415, 126.995, 37.475] as const;
const GRID_SIZE = 257;

export interface TerrainGrid {
  width: number;
  height: number;
  elevations: Float32Array;
  minElevationM: number;
  maxElevationM: number;
  bounds: typeof GWANAK_BOUNDS;
}

export async function loadGwanakDem(signal: AbortSignal): Promise<TerrainGrid> {
  const tiff = await fromUrl(DEM_URL, {}, signal);

  try {
    const image = await tiff.getImage();
    const crs = image.getGeoKeys()?.GeographicTypeGeoKey;
    const [west, south, east, north] = GWANAK_BOUNDS;
    const [tileWest, tileSouth, tileEast, tileNorth] = image.getBoundingBox();

    if (
      crs !== 4326 ||
      west < tileWest ||
      south < tileSouth ||
      east > tileEast ||
      north > tileNorth
    ) {
      throw new Error('관악산 범위 또는 좌표계가 예상한 DEM과 다릅니다.');
    }

    const [originX, originY] = image.getOrigin();
    const [resolutionX, resolutionY] = image.getResolution();
    if (resolutionX <= 0 || resolutionY >= 0) {
      throw new Error('DEM 픽셀 방향을 해석할 수 없습니다.');
    }

    const window = [
      Math.max(0, Math.floor((west - originX) / resolutionX)),
      Math.max(0, Math.floor((north - originY) / resolutionY)),
      Math.min(image.getWidth(), Math.ceil((east - originX) / resolutionX)),
      Math.min(image.getHeight(), Math.ceil((south - originY) / resolutionY)),
    ];

    const samples = await image.readRasters({
      window,
      width: GRID_SIZE,
      height: GRID_SIZE,
      samples: [0],
      interleave: true,
      resampleMethod: 'bilinear',
      signal,
    });

    const noData = image.getGDALNoData();
    const elevations = new Float32Array(samples.length);
    let minElevationM = Infinity;
    let maxElevationM = -Infinity;

    for (let index = 0; index < samples.length; index += 1) {
      const elevation = samples[index];
      if (!Number.isFinite(elevation) || (noData !== null && elevation === noData)) {
        elevations[index] = NaN;
        continue;
      }

      elevations[index] = elevation;
      minElevationM = Math.min(minElevationM, elevation);
      maxElevationM = Math.max(maxElevationM, elevation);
    }

    if (!Number.isFinite(minElevationM) || samples.length !== GRID_SIZE * GRID_SIZE) {
      throw new Error('DEM 고도 표본을 읽을 수 없습니다.');
    }

    return {
      width: GRID_SIZE,
      height: GRID_SIZE,
      elevations,
      minElevationM,
      maxElevationM,
      bounds: GWANAK_BOUNDS,
    };
  } finally {
    await tiff.close();
  }
}
