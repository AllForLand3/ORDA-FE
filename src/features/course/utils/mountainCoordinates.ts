/** GeoJSON Point 좌표: EPSG:4326, [경도, 위도]. */
export function isValidMountainCoordinate(coordinate: readonly number[] | null | undefined) {
  if (!coordinate || coordinate.length !== 2) return false;
  const [longitude, latitude] = coordinate;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}
