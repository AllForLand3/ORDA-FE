// GeoJSON 좌표는 [경도, 위도] 순서다. 좌표계는 API 기준 EPSG:4326이다.
export type GeoJsonPosition = [longitude: number, latitude: number];

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: GeoJsonPosition[];
}
