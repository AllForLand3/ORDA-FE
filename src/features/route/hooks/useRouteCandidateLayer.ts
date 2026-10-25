import { useEffect, useMemo } from 'react';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';

import { API_PROJECTION, MAP_PROJECTION } from '@/lib/projection';

import type { RouteSearchCandidate } from '../types/route-search';

const CANDIDATE_STYLE = new Style({
  stroke: new Stroke({ color: 'rgba(7, 92, 71, 0.45)', width: 4 }),
  zIndex: 1,
});

const SELECTED_CANDIDATE_STYLES = [
  new Style({ stroke: new Stroke({ color: '#ffffff', width: 9 }), zIndex: 2 }),
  new Style({ stroke: new Stroke({ color: '#008f68', width: 5 }), zIndex: 3 }),
];

function isValidLineString(candidate: RouteSearchCandidate) {
  const { geometry } = candidate;
  return (
    geometry?.type === 'LineString' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length >= 2 &&
    geometry.coordinates.every(
      ([longitude, latitude]) =>
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90,
    )
  );
}

// 서버가 준 경로 후보 선형만 표시한다. 선형이 없거나 잘못된 후보는 그리지 않고 대체 도형도 만들지 않는다.
export function useRouteCandidateLayer(
  candidates: readonly RouteSearchCandidate[],
  selectedRank: number | null,
) {
  const { layer, source } = useMemo(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({ source });
    layer.set('name', 'route-search-candidates');
    return { layer, source };
  }, []);

  useEffect(() => {
    source.clear(true);

    const format = new GeoJSON();
    // 좌표 변환은 여기서 한 번만 한다: API EPSG:4326 [경도, 위도] → 지도 EPSG:3857.
    const features = format.readFeatures(
      {
        type: 'FeatureCollection',
        features: candidates.filter(isValidLineString).map((candidate) => ({
          type: 'Feature',
          id: `route-candidate:${candidate.rank}`,
          properties: { rank: candidate.rank },
          geometry: candidate.geometry,
        })),
      },
      { dataProjection: API_PROJECTION, featureProjection: MAP_PROJECTION },
    );

    for (const feature of features) {
      feature.setStyle(
        feature.get('rank') === selectedRank ? SELECTED_CANDIDATE_STYLES : CANDIDATE_STYLE,
      );
    }
    source.addFeatures(features);

    return () => source.clear(true);
  }, [candidates, selectedRank, source]);

  return layer;
}
