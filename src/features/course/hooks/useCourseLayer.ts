import { useEffect, useMemo, useState } from 'react';
import Feature from 'ol/Feature.js';
import type { Extent } from 'ol/extent.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import LineString from 'ol/geom/LineString.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { Stroke, Style } from 'ol/style.js';

import type { CourseGeometry } from '../types/course';

const courseStyle = new Style({ stroke: new Stroke({ color: '#075c47', width: 4 }) });
type EditableLineLayer = VectorLayer<VectorSource<Feature<LineString>>>;

function projectGeometry(geometry: CourseGeometry | undefined) {
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
        Math.abs(point[1]) <= 90,
    )
  ) {
    return null;
  }

  const first = geometry.coordinates[0];
  if (!geometry.coordinates.some(([x, y]) => x !== first[0] || y !== first[1])) return null;

  const projected = new GeoJSON().readGeometry(geometry, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  return projected instanceof LineString ? projected : null;
}

function createLayer(geometry: LineString): EditableLineLayer {
  const source = new VectorSource({ features: [new Feature<LineString>(geometry)] });
  return new VectorLayer({ source, style: courseStyle, zIndex: 10 });
}

export function useCourseLayer(geometry: CourseGeometry | undefined) {
  return useMemo(() => {
    const projected = projectGeometry(geometry);
    if (!projected) return null;
    const layer = createLayer(projected);

    return { layers: [layer], extent: projected.getExtent() };
  }, [geometry]);
}

export interface EditableCourseLayer {
  layers: [EditableLineLayer];
  extent: Extent;
  editableLayer: EditableLineLayer;
}

export function useEditableCourseLayer(geometry: CourseGeometry): EditableCourseLayer | null {
  const [resource] = useState<EditableCourseLayer | null>(() => {
    const projected = projectGeometry(geometry);
    if (!projected) return null;
    const layer = createLayer(projected);
    return {
      layers: [layer],
      extent: projected.getExtent(),
      editableLayer: layer,
    };
  });

  useEffect(() => {
    const projected = projectGeometry(geometry);
    const current = resource?.editableLayer.getSource()?.getFeatures()[0]?.getGeometry();
    if (projected && current) current.setCoordinates(projected.getCoordinates());
  }, [geometry, resource]);

  return resource;
}
