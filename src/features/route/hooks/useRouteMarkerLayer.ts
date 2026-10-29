import { useEffect, useMemo } from 'react';

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { fromLonLat, transform } from 'ol/proj.js';
import CircleStyle from 'ol/style/Circle.js';
import RegularShape from 'ol/style/RegularShape.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import Text from 'ol/style/Text.js';

import { API_PROJECTION, MAP_PROJECTION } from '@/lib/projection';
import type { GeoJsonPosition } from '@/shared/types/geojson';

import type { RouteCoordinate, RoutePlace, RoutePointRole } from '../mocks/route-setup';

type MarkerRole = RoutePointRole | 'pending';

// 서버가 돌려준 스냅 노드 위치(EPSG:4326). 사용자가 지정한 위치와 별도 Feature로 그린다.
export interface RouteSnappedPositions {
  origin: GeoJsonPosition | null;
  destination: GeoJsonPosition | null;
  pending: GeoJsonPosition | null;
}

const NO_SNAPPED_POSITIONS: RouteSnappedPositions = {
  origin: null,
  destination: null,
  pending: null,
};

function isValidLonLat([longitude, latitude]: RouteCoordinate) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

// 스냅된 등산로 노드는 선택 위치(원)와 구분되는 작은 마름모로 표시한다.
function createSnappedStyle(role: MarkerRole) {
  const color = role === 'destination' ? '#e4573d' : role === 'origin' ? '#075c47' : '#008f68';

  return new Style({
    image: new RegularShape({
      points: 4,
      radius: 8,
      angle: 0,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color, width: 3 }),
    }),
    zIndex: 2,
  });
}

function createMarkerStyle(role: MarkerRole, isUserSelected: boolean) {
  const fill = role === 'destination' ? '#e4573d' : '#075c47';
  const label = role === 'pending' ? '선택 중' : role === 'origin' ? '출발' : '도착';

  return new Style({
    image: new CircleStyle({
      radius: role === 'pending' ? 17 : 13,
      fill: new Fill({ color: role === 'pending' ? 'rgba(0, 143, 104, 0.25)' : fill }),
      stroke: new Stroke({
        color: isUserSelected ? '#008f68' : role === 'pending' ? '#008f68' : '#ffffff',
        width: isUserSelected ? 4 : 3,
        lineDash: isUserSelected ? [4, 3] : undefined,
      }),
    }),
    text: new Text({
      text: isUserSelected ? `${label} · 지도 선택` : label,
      offsetY: role === 'pending' ? -34 : -28,
      font: '700 13px Pretendard, sans-serif',
      fill: new Fill({ color: '#123d32' }),
      backgroundFill: new Fill({ color: '#ffffff' }),
      padding: [4, 7, 4, 7],
    }),
  });
}

export function useRouteMarkerLayer(
  origin: RoutePlace | null,
  destination: RoutePlace | null,
  pendingPlace: RoutePlace | null,
  snapped: RouteSnappedPositions = NO_SNAPPED_POSITIONS,
) {
  const {
    origin: snappedOrigin,
    destination: snappedDestination,
    pending: snappedPending,
  } = snapped;

  const { layer, source } = useMemo(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({ source });
    layer.set('name', 'route-setup-selected-points');
    return { layer, source };
  }, []);

  useEffect(() => {
    source.clear(true);

    const addPlace = (place: RoutePlace | null, role: MarkerRole) => {
      if (!place || !isValidLonLat(place.coordinates)) return;

      const [longitude, latitude] = place.coordinates;
      const feature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude], MAP_PROJECTION)),
      });
      feature.setId(`${role}:${place.id}`);
      feature.set('role', role);
      feature.setStyle(createMarkerStyle(role, place.source === 'map'));
      source.addFeature(feature);
    };

    const addSnapped = (position: GeoJsonPosition | null, role: MarkerRole) => {
      if (!position || !isValidLonLat(position)) return;

      // 좌표 변환은 여기서 한 번만 한다: API EPSG:4326 [경도, 위도] → 지도 EPSG:3857.
      const feature = new Feature({
        geometry: new Point(transform(position, API_PROJECTION, MAP_PROJECTION)),
      });
      feature.setId(`snapped:${role}`);
      feature.set('role', role);
      feature.set('kind', 'snapped-node');
      feature.setStyle(createSnappedStyle(role));
      source.addFeature(feature);
    };

    addPlace(origin, 'origin');
    addPlace(destination, 'destination');
    addSnapped(origin ? snappedOrigin : null, 'origin');
    addSnapped(destination ? snappedDestination : null, 'destination');
    if (pendingPlace && pendingPlace.id !== origin?.id && pendingPlace.id !== destination?.id) {
      addPlace(pendingPlace, 'pending');
      addSnapped(snappedPending, 'pending');
    }
    return () => source.clear(true);
  }, [
    destination,
    origin,
    pendingPlace,
    snappedDestination,
    snappedOrigin,
    snappedPending,
    source,
  ]);

  return layer;
}
