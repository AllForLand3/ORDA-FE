/** Map bridge coordinates are EPSG:4326; zoom uses the OpenLayers Web Mercator scale. */
export interface MapViewState {
  center: readonly [longitude: number, latitude: number];
  zoom: number;
}

export function isMapViewState(value: unknown): value is MapViewState {
  if (!value || typeof value !== 'object' || !('center' in value) || !('zoom' in value))
    return false;
  const { center, zoom } = value;
  return (
    Array.isArray(center) &&
    center.length === 2 &&
    center.every((number: unknown) => typeof number === 'number' && Number.isFinite(number)) &&
    Math.abs(center[0]) <= 180 &&
    Math.abs(center[1]) <= 85.051129 &&
    typeof zoom === 'number' &&
    Number.isFinite(zoom) &&
    zoom >= 2 &&
    zoom <= 19
  );
}
