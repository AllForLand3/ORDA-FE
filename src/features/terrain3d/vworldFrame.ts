import { applyGwanakDem } from './applyGwanakDem';
import { loadGwanakDem } from './loadGwanakDem';
import type { TerrainGrid } from './loadGwanakDem';
import './types/vworld';

const MAP_ID = 'vworld-terrain-map';
const SDK_TIMEOUT_MS = 30_000;
const abortController = new AbortController();

interface FrameMessage {
  type: 'orda-terrain3d';
  status: 'loading' | 'ready' | 'error';
  message?: string;
  minElevationM?: number;
  maxElevationM?: number;
}

function report(message: FrameMessage) {
  window.parent.postMessage(message, window.location.origin);
}

function startVWorldMap(terrain: TerrainGrid) {
  const vw = window.vw;
  const cesium = window.Cesium;

  if (!vw || !cesium || !window.ws3d) {
    throw new Error(
      'VWorld 3D 지도 SDK를 불러오지 못했습니다. 인증키와 등록 도메인을 확인해 주세요.',
    );
  }

  report({
    type: 'orda-terrain3d',
    status: 'loading',
    message: 'VWorld 3D 지도를 준비하고 있습니다.',
  });
  const timeout = window.setTimeout(() => {
    report({
      type: 'orda-terrain3d',
      status: 'error',
      message: 'VWorld 3D 지도의 응답이 없습니다. 인증키와 네트워크 상태를 확인해 주세요.',
    });
  }, SDK_TIMEOUT_MS);

  vw.ws3dInitCallBack = () => {
    if (abortController.signal.aborted) return;

    const viewer = window.ws3d?.viewer;
    if (!viewer?.terrainProvider) {
      window.clearTimeout(timeout);
      report({
        type: 'orda-terrain3d',
        status: 'error',
        message: '3D 지도의 지형 정보를 연결하지 못했습니다.',
      });
      return;
    }

    try {
      const original = viewer.terrainProvider;
      let demTileCount = 0;
      viewer.terrainProvider = applyGwanakDem(original, terrain, cesium, () => {
        demTileCount += 1;
        document.body.dataset.demTileCount = String(demTileCount);
        if (demTileCount === 1) {
          window.clearTimeout(timeout);
          document.body.dataset.demReady = 'true';
          report({
            type: 'orda-terrain3d',
            status: 'ready',
            minElevationM: terrain.minElevationM,
            maxElevationM: terrain.maxElevationM,
          });
        }
      });
      window.setTimeout(() => {
        if (abortController.signal.aborted) return;
        viewer.camera.flyTo({
          destination: cesium.Cartesian3.fromDegrees(126.96444, 37.44472, 2200),
          orientation: {
            heading: 0,
            pitch: cesium.Math.toRadians(-55),
            roll: 0,
          },
          duration: 0,
        });
      }, 2_000);
    } catch {
      window.clearTimeout(timeout);
      report({
        type: 'orda-terrain3d',
        status: 'error',
        message: '관악산 DEM 고도를 3D 지도에 적용하지 못했습니다.',
      });
    }
  };

  const map = new vw.Map();
  map.setOption({
    mapId: MAP_ID,
    initPosition: new vw.CameraPosition(
      new vw.CoordZ(126.96444, 37.44472, 3500),
      new vw.Direction(0, -55, 0),
    ),
    logo: true,
    navigation: false,
  });
  map.setMapId(MAP_ID);
  map.start();
}

window.addEventListener('pagehide', () => abortController.abort(), { once: true });
report({ type: 'orda-terrain3d', status: 'loading', message: '관악산 DEM 고도를 읽고 있습니다.' });
loadGwanakDem(abortController.signal)
  .then((terrain) => {
    if (!abortController.signal.aborted) startVWorldMap(terrain);
  })
  .catch((error: unknown) => {
    if (abortController.signal.aborted) return;
    report({
      type: 'orda-terrain3d',
      status: 'error',
      message: error instanceof Error ? error.message : '관악산 DEM을 읽지 못했습니다.',
    });
  });
