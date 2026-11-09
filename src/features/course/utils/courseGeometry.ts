import type { CourseGeometry } from '../types/course';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCourseFile(text: string): CourseGeometry {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('JSON 형식을 읽을 수 없습니다. 파일 내용을 확인해주세요.');
  }
  if (!isRecord(value)) throw new Error('GeoJSON 객체를 선택해주세요.');
  if ('crs' in value)
    throw new Error(
      '별도 좌표계가 지정된 파일은 지원하지 않습니다. EPSG:4326 파일을 선택해주세요.',
    );
  if (value.type === 'FeatureCollection') {
    if (!Array.isArray(value.features) || value.features.length !== 1) {
      throw new Error('FeatureCollection에는 코스 Feature가 정확히 1개 있어야 합니다.');
    }
    value = value.features[0];
    if (!isRecord(value) || value.type !== 'Feature')
      throw new Error('올바른 코스 Feature가 필요합니다.');
  }
  if (isRecord(value) && value.type === 'Feature') {
    if ('crs' in value)
      throw new Error(
        '별도 좌표계가 지정된 파일은 지원하지 않습니다. EPSG:4326 파일을 선택해주세요.',
      );
    value = value.geometry;
  }
  return readCourseGeometry(value);
}

/** EPSG:4326 2D LineString을 검증한다. 순서·방향·꼭짓점을 보정하지 않는다. */
export function readCourseGeometry(value: unknown): CourseGeometry {
  if (!isRecord(value) || value.type !== 'LineString' || !Array.isArray(value.coordinates)) {
    throw new Error('단일 LineString 코스만 가져올 수 있습니다.');
  }
  if ('crs' in value)
    throw new Error(
      '별도 좌표계가 지정된 파일은 지원하지 않습니다. EPSG:4326 파일을 선택해주세요.',
    );
  const coordinates: CourseGeometry['coordinates'] = [];
  for (const point of value.coordinates) {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number' ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1]) ||
      Math.abs(point[0]) > 180 ||
      Math.abs(point[1]) > 90
    ) {
      throw new Error(
        '좌표는 유한한 숫자의 [경도, 위도] 쌍이어야 합니다. 경도는 -180~180, 위도는 -90~90 범위입니다.',
      );
    }
    coordinates.push([point[0], point[1]]);
  }
  const first = coordinates[0];
  if (
    !first ||
    coordinates.length < 2 ||
    !coordinates.some(([x, y]) => x !== first[0] || y !== first[1])
  ) {
    throw new Error('코스에는 서로 다른 좌표가 최소 2개 필요합니다.');
  }
  return { type: 'LineString', coordinates };
}
