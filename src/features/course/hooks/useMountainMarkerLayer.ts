import { useEffect, useMemo } from 'react';

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { fromLonLat } from 'ol/proj.js';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style.js';

import goldPin from '@/assets/course/mountain-pin-gold.svg';
import greenPin from '@/assets/course/mountain-pin-green.svg';

import type { MountainListItem } from '../types/mountain';

function isValidCoordinate(coordinate: readonly number[]) {
  const [longitude, latitude] = coordinate;

  return (
    coordinate.length === 2 &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

export function useMountainMarkerLayer(
  mountains: MountainListItem[],
  selectedMountainId: string | null,
) {
  const layer = useMemo(() => {
    const styles = new Map<string, Style>();

    const getStyle = (
      mountainId: string,
      mountainName: string,
      elevationMeters: number | null,
      isSelected: boolean,
    ) => {
      const cacheKey = `${mountainId}:${mountainName}:${elevationMeters ?? ''}:${isSelected}`;
      const cachedStyle = styles.get(cacheKey);

      if (cachedStyle) {
        return cachedStyle;
      }

      const style = new Style({
        image: new Icon({
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: isSelected ? 1.08 : 1,
          src: isSelected ? goldPin : greenPin,
        }),
        text: new Text({
          backgroundFill: new Fill({ color: '#123d32' }),
          font: `${isSelected ? '700' : '600'} 11px Pretendard, sans-serif`,
          offsetX: 34,
          offsetY: -18,
          padding: [4, 7, 4, 7],
          text:
            elevationMeters === null
              ? mountainName
              : `${mountainName}\n${elevationMeters.toLocaleString('ko-KR')}m`,
          textAlign: 'left',
          textBaseline: 'middle',
          fill: new Fill({ color: '#ffffff' }),
          stroke: new Stroke({ color: '#123d32', width: 1 }),
        }),
      });

      styles.set(cacheKey, style);

      return style;
    };

    return new VectorLayer({
      source: new VectorSource(),
      style: (feature) => {
        const mountainId = feature.get('mountainId');
        const mountainName = feature.get('mountainName');
        const elevationMeters = feature.get('elevationMeters');

        if (typeof mountainId !== 'string' || typeof mountainName !== 'string') {
          return undefined;
        }

        return getStyle(
          mountainId,
          mountainName,
          typeof elevationMeters === 'number' ? elevationMeters : null,
          Boolean(feature.get('isSelected')),
        );
      },
      zIndex: 10,
    });
  }, []);

  useEffect(() => {
    const source = layer.getSource();
    const features = mountains.flatMap((mountain) => {
      const coordinate = mountain.geometry?.coordinates;

      if (!coordinate || !isValidCoordinate(coordinate)) {
        return [];
      }

      const feature = new Feature({
        geometry: new Point(fromLonLat([...coordinate], 'EPSG:3857')),
        mountainId: mountain.mountainId,
        mountainName: mountain.mountainName,
        elevationMeters: mountain.elevationMeters,
        isSelected: mountain.mountainId === selectedMountainId,
      });
      feature.setId(mountain.mountainId);

      return [feature];
    });

    source?.clear();
    source?.addFeatures(features);
    layer.changed();
  }, [layer, mountains, selectedMountainId]);

  return layer;
}
