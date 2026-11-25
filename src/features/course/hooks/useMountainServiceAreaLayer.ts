import { useEffect, useMemo } from 'react';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { Fill, Stroke, Style } from 'ol/style.js';

import { API_PROJECTION, MAP_PROJECTION } from '@/lib/projection';

import type { ServiceAreaFeatureCollection } from '../types/mountain';

const SERVICE_AREA_STYLES = [
  new Style({
    stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.9)', width: 5 }),
  }),
  new Style({
    fill: new Fill({ color: 'rgba(229, 180, 65, 0.2)' }),
    stroke: new Stroke({ color: '#9a680d', width: 3 }),
  }),
];

/** 선택한 산의 API 서비스 영역을 지도 투영으로 한 번 변환해 마커 아래에 강조한다. */
export function useMountainServiceAreaLayer(serviceArea: ServiceAreaFeatureCollection | undefined) {
  const { layer, source } = useMemo(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      style: SERVICE_AREA_STYLES,
      zIndex: 9,
    });
    layer.set('name', 'selected-mountain-service-area');
    return { layer, source };
  }, []);

  useEffect(() => {
    source.clear(true);
    if (!Array.isArray(serviceArea?.features) || serviceArea.features.length === 0) return;

    try {
      const features = new GeoJSON().readFeatures(serviceArea, {
        dataProjection: API_PROJECTION,
        featureProjection: MAP_PROJECTION,
      });
      source.addFeatures(features);
    } catch {
      source.clear(true);
    }

    return () => source.clear(true);
  }, [serviceArea, source]);

  return layer;
}
