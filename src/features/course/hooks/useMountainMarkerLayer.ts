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
import { isValidMountainCoordinate } from '../utils/mountainCoordinates';

export function useMountainMarkerLayer(
  mountains: MountainListItem[],
  selectedMountain: MountainListItem | null,
) {
  const markerMountains = useMemo(() => {
    if (!selectedMountain) return mountains;
    return [
      ...mountains.filter((mountain) => mountain.mountainId !== selectedMountain.mountainId),
      selectedMountain,
    ];
  }, [mountains, selectedMountain]);

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
    const features = markerMountains.flatMap((mountain) => {
      const coordinate = mountain.geometry?.coordinates;

      if (!coordinate || !isValidMountainCoordinate(coordinate)) {
        return [];
      }

      const feature = new Feature({
        geometry: new Point(fromLonLat([...coordinate], 'EPSG:3857')),
        mountainId: mountain.mountainId,
        mountainName: mountain.mountainName,
        elevationMeters: mountain.elevationMeters,
        isSelected: mountain.mountainId === selectedMountain?.mountainId,
      });
      feature.setId(mountain.mountainId);

      return [feature];
    });

    source?.clear();
    source?.addFeatures(features);
    layer.changed();
  }, [layer, markerMountains, selectedMountain]);

  return layer;
}
