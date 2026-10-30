import { useEffect, useMemo } from 'react';

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { fromLonLat } from 'ol/proj.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import Text from 'ol/style/Text.js';

import type { RoutePlace, RoutePointRole } from '../mocks/route-setup';

function createMarkerStyle(role: RoutePointRole | 'pending', placeName: string) {
  const fill = role === 'destination' ? '#e4573d' : '#075c47';
  const label = role === 'pending' ? '선택 중' : role === 'origin' ? '출발' : '도착';

  return new Style({
    image: new CircleStyle({
      radius: role === 'pending' ? 17 : 13,
      fill: new Fill({ color: role === 'pending' ? 'rgba(0, 143, 104, 0.25)' : fill }),
      stroke: new Stroke({
        color: role === 'pending' ? '#008f68' : '#ffffff',
        width: 3,
      }),
    }),
    text: new Text({
      text: `${label}\n${placeName}`,
      offsetY: role === 'pending' ? -44 : -38,
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
) {
  const { layer, source } = useMemo(() => {
    const source = new VectorSource();
    const layer = new VectorLayer({ source });
    layer.set('name', 'route-setup-selected-points');
    return { layer, source };
  }, []);

  useEffect(() => {
    source.clear(true);

    const addPlace = (place: RoutePlace | null, role: RoutePointRole | 'pending') => {
      if (!place) return;

      const [longitude, latitude] = place.coordinates;
      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        return;
      }

      const feature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude], 'EPSG:3857')),
      });
      feature.setId(`${role}:${place.id}`);
      feature.set('role', role);
      feature.set('placeName', place.name);
      feature.setStyle(createMarkerStyle(role, place.name));
      source.addFeature(feature);
    };

    addPlace(origin, 'origin');
    addPlace(destination, 'destination');
    if (pendingPlace && pendingPlace.id !== origin?.id && pendingPlace.id !== destination?.id) {
      addPlace(pendingPlace, 'pending');
    }
    return () => source.clear(true);
  }, [destination, origin, pendingPlace, source]);

  return layer;
}
