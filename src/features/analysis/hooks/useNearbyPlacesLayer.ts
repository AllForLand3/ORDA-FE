import { useEffect, useMemo } from 'react';

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import { transform } from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Icon from 'ol/style/Icon.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';

import parkingIcon from '@/assets/course/course-parking.svg';
import shelterIcon from '@/assets/course/course-shelter.svg';
import toiletIcon from '@/assets/course/course-toilet.svg';
import { API_PROJECTION, MAP_PROJECTION } from '@/lib/projection';

import type { NearbyPlace, NearbyPlaceKind } from './useCourseNearby';

const NO_PLACES: readonly NearbyPlace[] = [];

const ICON_STYLES: Record<NearbyPlaceKind, Style> = {
  TOILET: new Style({ image: new Icon({ src: toiletIcon, width: 16, height: 16 }) }),
  PARKING: new Style({ image: new Icon({ src: parkingIcon, width: 16, height: 16 }) }),
  SHELTER: new Style({ image: new Icon({ src: shelterIcon, width: 16, height: 16 }) }),
};

/** 흰 원 위에 시설 유형 아이콘을 올린다. 선택한 시설은 테두리를 강조하고 다른 시설보다 위에 그린다. */
function placeStyles(kind: NearbyPlaceKind, selected: boolean): Style[] {
  const zIndex = selected ? 20 : 10;
  const iconStyle = ICON_STYLES[kind].clone();
  iconStyle.setZIndex(zIndex + 1);
  return [
    new Style({
      image: new CircleStyle({
        radius: selected ? 16 : 13,
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: selected ? '#e4573d' : '#3d7fbf', width: selected ? 3 : 2 }),
      }),
      zIndex,
    }),
    iconStyle,
  ];
}

/**
 * 주변 시설 목록의 위치를 지도에 표시하는 레이어. 레이어 객체는 한 번만 만들고 Feature만 바꾼다.
 * Feature ID는 목록 항목 key라서 클릭하면 목록 항목과 연결된다. 위치가 없는 항목은 그리지 않는다.
 */
export function useNearbyPlacesLayer(
  places: readonly NearbyPlace[] | undefined,
  selectedKey: string | null = null,
) {
  const { layer, source } = useMemo(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({ source });
    layer.set('name', 'nearby-places');
    layer.set('clickable', true);
    return { layer, source };
  }, []);
  const visiblePlaces = places ?? NO_PLACES;

  useEffect(() => {
    source.clear(true);
    // 좌표 변환은 여기서 한 번만 한다: API EPSG:4326 [경도, 위도] → 지도 EPSG:3857.
    const features = visiblePlaces.flatMap((place) => {
      if (!place.coordinates) return [];
      const feature = new Feature({
        geometry: new Point(transform(place.coordinates, API_PROJECTION, MAP_PROJECTION)),
        name: place.name,
        kind: place.kind,
      });
      feature.setId(place.key);
      feature.setStyle(placeStyles(place.kind, place.key === selectedKey));
      return [feature];
    });
    source.addFeatures(features);

    return () => source.clear(true);
  }, [selectedKey, source, visiblePlaces]);

  return layer;
}
