import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import Attribution from 'ol/control/Attribution.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import Map from 'ol/Map.js';
import type BaseLayer from 'ol/layer/Base.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { unByKey } from 'ol/Observable.js';
import type { EventsKey } from 'ol/events.js';

import { GWANAKSAN_SUMMIT } from '../constants';

import 'ol/ol.css';

import './openlayers-map.css';

export type LongitudeLatitude = readonly [longitude: number, latitude: number];
export type BaseMapType = 'street' | 'satellite';

export interface MapController {
  centerOn: (coordinate: LongitudeLatitude, zoom?: number) => boolean;
  isBaseMapAvailable: (type: BaseMapType) => boolean;
  setBaseMap: (type: BaseMapType) => boolean;
}

export interface OpenLayersMapProps {
  additionalLayers?: BaseLayer[];
  initialCenter?: LongitudeLatitude | null;
  initialZoom?: number;
  onMapClick?: (coordinate: LongitudeLatitude) => void;
  onControllerChange?: (controller: MapController | null) => void;
  targetRef: RefObject<HTMLDivElement | null>;
}

const INITIAL_ZOOM = 14;
const MAX_ZOOM = 19;
const EMPTY_LAYERS: BaseLayer[] = [];
const VWORLD_KEY = import.meta.env.VITE_VWORLD_KEY?.trim();

function isValidCoordinate(coordinate: readonly number[]): coordinate is LongitudeLatitude {
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

export function OpenLayersMap({
  additionalLayers = EMPTY_LAYERS,
  initialCenter = GWANAKSAN_SUMMIT,
  initialZoom = INITIAL_ZOOM,
  onMapClick,
  onControllerChange,
  targetRef,
}: OpenLayersMapProps) {
  const onControllerChangeRef = useRef(onControllerChange);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onControllerChangeRef.current = onControllerChange;
  }, [onControllerChange]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    const target = targetRef.current;

    if (!target) {
      return undefined;
    }

    const osmLayer = new TileLayer({
      source: new OSM(),
    });
    const satelliteLayer = VWORLD_KEY
      ? new TileLayer({
          source: new XYZ({
            attributions:
              '© <a href="https://www.vworld.kr/" target="_blank" rel="noopener noreferrer">VWorld</a>',
            maxZoom: MAX_ZOOM,
            url: `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(VWORLD_KEY)}/Satellite/{z}/{y}/{x}.jpeg`,
          }),
          visible: false,
        })
      : null;
    let isActive = true;
    const view = new View({
      center: initialCenter ? fromLonLat([...initialCenter]) : undefined,
      maxZoom: MAX_ZOOM,
      minZoom: 2,
      projection: 'EPSG:3857',
      zoom: initialCenter ? initialZoom : undefined,
    });
    const map = new Map({
      controls: defaultControls({ attribution: false, rotate: false }).extend([
        new Attribution({ collapsible: false }),
      ]),
      interactions: defaultInteractions({
        altShiftDragRotate: false,
        pinchRotate: false,
      }),
      layers: [osmLayer, ...(satelliteLayer ? [satelliteLayer] : []), ...additionalLayers],
      target,
      view,
    });

    let viewRevision = 0;
    const refreshMapState = () => {
      const size = map.getSize();
      const zoom = view.getZoom();

      target.dataset.mapReady = 'true';
      target.dataset.mapBaseLayer = satelliteLayer?.getVisible() ? 'satellite' : 'street';
      target.dataset.mapProjection = view.getProjection().getCode();

      if (zoom !== undefined) {
        target.dataset.mapZoom = String(Math.round(zoom * 100) / 100);
      } else {
        delete target.dataset.mapZoom;
      }

      if (size) {
        target.dataset.mapSize = `${Math.round(size[0])}x${Math.round(size[1])}`;
      }
    };
    const recordViewChange = () => {
      viewRevision += 1;
      target.dataset.mapViewRevision = String(viewRevision);
      refreshMapState();
    };
    const updateSize = () => {
      map.updateSize();
      refreshMapState();
    };
    const moveEndKey: EventsKey = map.on('moveend', recordViewChange);
    const mapClickKey: EventsKey = map.on('singleclick', (event) => {
      const [longitude, latitude] = toLonLat(event.coordinate, 'EPSG:3857');
      onMapClickRef.current?.([longitude, latitude]);
    });
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateSize);

    resizeObserver?.observe(target);
    window.addEventListener('resize', updateSize);

    const initialSizeFrame = window.requestAnimationFrame(updateSize);
    const controller: MapController = {
      centerOn: (coordinate, zoom = INITIAL_ZOOM + 1) => {
        if (!isActive || !isValidCoordinate(coordinate)) {
          return false;
        }

        const targetZoom = Number.isFinite(zoom) ? zoom : INITIAL_ZOOM + 1;
        view.animate({
          center: fromLonLat([...coordinate]),
          duration: 180,
          zoom: Math.min(MAX_ZOOM, Math.max(2, targetZoom)),
        });

        return true;
      },
      isBaseMapAvailable: (type) => type === 'street' || satelliteLayer !== null,
      setBaseMap: (type) => {
        if (!isActive || (type === 'satellite' && !satelliteLayer)) {
          return false;
        }

        const isSatellite = type === 'satellite';
        osmLayer.setVisible(!isSatellite);
        satelliteLayer?.setVisible(isSatellite);
        target.dataset.mapBaseLayer = type;

        return true;
      },
    };

    refreshMapState();
    onControllerChangeRef.current?.(controller);

    return () => {
      isActive = false;
      window.cancelAnimationFrame(initialSizeFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSize);
      unByKey(moveEndKey);
      unByKey(mapClickKey);
      onControllerChangeRef.current?.(null);
      delete target.dataset.mapReady;
      delete target.dataset.mapBaseLayer;
      delete target.dataset.mapProjection;
      delete target.dataset.mapZoom;
      delete target.dataset.mapSize;
      delete target.dataset.mapViewRevision;
      map.setTarget(undefined);
      map.dispose();
    };
  }, [additionalLayers, initialCenter, initialZoom, targetRef]);

  return null;
}
