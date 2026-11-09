import { sampleElevation } from './applyGwanakDem';
import type { TerrainGrid } from './loadGwanakDem';
import { isMapViewState } from '@/shared/mapView';
import type { MapViewState } from '@/shared/mapView';
import type { CesiumTerrainApi, VWorldViewer } from './types/vworld';

const MERCATOR_RESOLUTION = 156543.03392804097;

/** Match scale at the screen center; perspective cannot match the entire 2D extent. */
export function connectMapView(
  viewer: VWorldViewer,
  cesium: CesiumTerrainApi,
  terrain: TerrainGrid,
) {
  const { camera, scene } = viewer;
  let initialized = false;
  let applying = false;
  const previousThreshold = camera.percentageChanged;
  camera.percentageChanged = 0.001;
  const fovy = () => camera.frustum.fovy ?? Math.PI / 3;
  const reportView = () => {
    if (!initialized || applying) return;
    const canvas = scene.canvas;
    if (!canvas.clientHeight || !canvas.clientWidth) return;
    const ray = camera.getPickRay(
      new cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
    );
    if (!ray) return;
    const target = scene.globe.pick(ray, scene);
    // When the center points at the sky, retain the last valid ground position.
    if (!target) return;
    const position = scene.globe.ellipsoid.cartesianToCartographic(target);
    const latitude = cesium.Math.toDegrees(position.latitude);
    const metersPerPixel =
      (2 * cesium.Cartesian3.distance(camera.positionWC, target) * Math.tan(fovy() / 2)) /
      canvas.clientHeight;
    const zoom = Math.log2((MERCATOR_RESOLUTION * Math.cos(position.latitude)) / metersPerPixel);
    const view: MapViewState = {
      center: [cesium.Math.toDegrees(position.longitude), latitude],
      zoom: Math.max(2, Math.min(19, zoom)),
    };
    if (isMapViewState(view))
      window.parent.postMessage({ type: 'orda-terrain3d-view', view }, window.location.origin);
  };
  const receive = (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const data = event.data;
    if (
      !data ||
      typeof data !== 'object' ||
      !('type' in data) ||
      data.type !== 'orda-terrain3d-set-view' ||
      !('view' in data) ||
      !isMapViewState(data.view)
    )
      return;
    const {
      center: [longitude, latitude],
      zoom,
    } = data.view;
    const [west, south, east, north] = terrain.bounds;
    const demHeight =
      longitude >= west && longitude <= east && latitude >= south && latitude <= north
        ? sampleElevation(terrain, longitude, latitude)
        : null;
    const height =
      demHeight ?? scene.globe.getHeight(cesium.Cartographic.fromDegrees(longitude, latitude));
    const metersPerPixel =
      (MERCATOR_RESOLUTION * Math.cos(cesium.Math.toRadians(latitude))) / 2 ** zoom;
    const range = (metersPerPixel * scene.canvas.clientHeight) / (2 * Math.tan(fovy() / 2));
    applying = true;
    try {
      camera.lookAt(
        cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        new cesium.HeadingPitchRange(0, cesium.Math.toRadians(-55), range),
      );
      camera.lookAtTransform(cesium.Matrix4.IDENTITY);
      initialized = true;
    } finally {
      applying = false;
    }
  };
  const removeChanged = camera.changed.addEventListener(reportView);
  const removeMoveEnd = camera.moveEnd.addEventListener(reportView);
  window.addEventListener('message', receive);
  return () => {
    removeChanged();
    removeMoveEnd();
    camera.percentageChanged = previousThreshold;
    window.removeEventListener('message', receive);
  };
}
