import { useEffect, useMemo } from 'react';

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { fromLonLat } from 'ol/proj.js';
import { Fill, Icon, Stroke, Style, Text } from 'ol/style.js';

import goldPin from '@/assets/course/mountain-pin-gold.svg';
import greenPin from '@/assets/course/mountain-pin-green.svg';

import { MOUNTAIN_MOCKS } from '../mocks/mountains';

export function useMountainMarkerLayer(selectedMountainId: string | null) {
  const layer = useMemo(() => {
    const styles = new Map<string, Style>();

    const getStyle = (mountain: (typeof MOUNTAIN_MOCKS)[number], isSelected: boolean) => {
      const cacheKey = `${mountain.id}:${isSelected}`;
      const cachedStyle = styles.get(cacheKey);

      if (cachedStyle) {
        return cachedStyle;
      }

      const pin = mountain.id === 'cheonggyesan' ? goldPin : greenPin;
      const style = new Style({
        image: new Icon({
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: isSelected ? 1.08 : 1,
          src: pin,
        }),
        text: new Text({
          backgroundFill: new Fill({ color: '#123d32' }),
          font: `${isSelected ? '700' : '600'} 11px Pretendard, sans-serif`,
          offsetX: 34,
          offsetY: -18,
          padding: [4, 7, 4, 7],
          text: `${mountain.name}\n${mountain.elevationMeters}m`,
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
      source: new VectorSource({
        features: MOUNTAIN_MOCKS.map((mountain) => {
          const feature = new Feature({
            geometry: new Point(fromLonLat([...mountain.coordinates], 'EPSG:3857')),
            mountainId: mountain.id,
            isSelected: false,
          });
          feature.setId(mountain.id);

          return feature;
        }),
      }),
      style: (feature) => {
        const mountainId = feature.get('mountainId');
        const mountain = MOUNTAIN_MOCKS.find((item) => item.id === mountainId);

        if (!mountain) {
          return undefined;
        }

        return getStyle(mountain, Boolean(feature.get('isSelected')));
      },
      zIndex: 10,
    });
  }, []);

  useEffect(() => {
    layer.getSource()?.forEachFeature((feature) => {
      feature.set('isSelected', feature.getId() === selectedMountainId);
    });
    layer.changed();
  }, [layer, selectedMountainId]);

  return layer;
}
