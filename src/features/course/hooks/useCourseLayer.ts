import { useMemo } from 'react';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { Stroke, Style } from 'ol/style.js';

import type { CourseGeometry } from '../types/course';

export function useCourseLayer(geometry: CourseGeometry | undefined) {
  return useMemo(() => {
    if (
      geometry?.type !== 'LineString' ||
      !Array.isArray(geometry.coordinates) ||
      geometry.coordinates.length < 2 ||
      !geometry.coordinates.every(
        (point) =>
          Array.isArray(point) &&
          point.length === 2 &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]) &&
          Math.abs(point[0]) <= 180 &&
          // EPSG:3857의 세계 범위. 입력 검증의 WGS84 ±90° 범위는 유지한다.
          Math.abs(point[1]) <= 85.0511287798066,
      )
    )
      return null;

    const first = geometry.coordinates[0];
    if (!geometry.coordinates.some(([x, y]) => x !== first[0] || y !== first[1])) return null;

    const projected = new GeoJSON().readGeometry(geometry, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
    if (!projected) return null;
    const source = new VectorSource({ features: [new Feature(projected)] });
    const layer = new VectorLayer({
      source,
      style: new Style({ stroke: new Stroke({ color: '#075c47', width: 4 }) }),
      zIndex: 10,
    });

    // 지도 생성·해제와 레이어 연결은 공통 OpenLayersMap이 담당한다.
    return { layers: [layer], extent: projected.getExtent() };
  }, [geometry]);
}
