import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import VectorLayer from 'ol/layer/Vector.js';
import type BaseLayer from 'ol/layer/Base.js';
import { toLonLat } from 'ol/proj.js';
import Style from 'ol/style/Style.js';
import { MAP_PROJECTION } from '@/lib/projection';
import type { TerrainLine } from '@/shared/terrainLines';

export function readTerrainLines(layers: BaseLayer[]): TerrainLine[] {
  const lines: TerrainLine[] = [];
  for (const layer of layers) {
    if (!(layer instanceof VectorLayer) || !layer.getVisible()) continue;
    for (const feature of layer.getSource()?.getFeatures() ?? []) {
      if (!(feature instanceof Feature)) continue;
      const geometry = feature.getGeometry();
      if (!(geometry instanceof LineString)) continue;
      const coordinates = geometry
        .getCoordinates()
        .map((point) => toLonLat(point, MAP_PROJECTION).slice(0, 2));
      const styles = feature.getStyle() ?? layer.getStyle();
      for (const style of Array.isArray(styles) ? styles : [styles]) {
        if (!(style instanceof Style)) continue;
        const stroke = style.getStroke();
        const color = stroke?.getColor();
        if (typeof color === 'string')
          lines.push({
            coordinates,
            color,
            width: stroke?.getWidth() ?? 1,
            zIndex: style.getZIndex() ?? 0,
          });
      }
    }
  }
  return lines;
}
