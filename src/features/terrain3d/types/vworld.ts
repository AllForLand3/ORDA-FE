export interface TerrainRectangle {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface TerrainProvider {
  tilingScheme: {
    tileXYToRectangle: (x: number, y: number, level: number) => TerrainRectangle;
  };
  requestTileGeometry: (x: number, y: number, level: number, request?: unknown) => unknown;
  getTileDataAvailable?: (x: number, y: number, level: number) => boolean | undefined;
}

export interface VWorldViewer {
  terrainProvider: TerrainProvider;
  camera: {
    flyTo: (options: {
      destination: unknown;
      orientation: { heading: number; pitch: number; roll: number };
      duration: number;
    }) => void;
  };
}

export interface VWorldApi {
  Map: new () => {
    setOption: (options: {
      mapId: string;
      initPosition: unknown;
      logo: boolean;
      navigation: boolean;
    }) => void;
    setMapId: (id: string) => void;
    start: () => void;
  };
  CameraPosition: new (coordinate: unknown, direction: unknown) => unknown;
  CoordZ: new (longitude: number, latitude: number, height: number) => unknown;
  Direction: new (heading: number, pitch: number, roll: number) => unknown;
  ws3dInitCallBack?: () => void;
}

export interface CesiumTerrainApi {
  Math: { toDegrees: (radians: number) => number; toRadians: (degrees: number) => number };
  Cartesian3: { fromDegrees: (longitude: number, latitude: number, height: number) => unknown };
  HeightmapTerrainData: new (options: {
    buffer: Float32Array;
    width: number;
    height: number;
    childTileMask: number;
  }) => unknown;
}

declare global {
  interface Window {
    vw?: VWorldApi;
    ws3d?: { viewer?: VWorldViewer };
    Cesium?: CesiumTerrainApi;
  }
}
