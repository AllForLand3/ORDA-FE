import { useEffect, useRef, useState } from 'react';
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
import type { Extent } from 'ol/extent.js';

import { InlineTerrainMap } from './InlineTerrainMap';
import type { TerrainMapBridge } from './InlineTerrainMap';
import type { MapViewState } from '@/shared/mapView';

import { GWANAKSAN_SUMMIT } from '../constants';

import 'ol/ol.css';

import './openlayers-map.css';

export type LongitudeLatitude = readonly [longitude: number, latitude: number];
export type BaseMapType = 'street' | 'satellite' | 'terrain';

export interface MapController {
  centerOn: (coordinate: LongitudeLatitude, zoom?: number) => boolean;
  isBaseMapAvailable: (type: BaseMapType) => boolean;
  setBaseMap: (type: BaseMapType) => boolean;
}

export interface OpenLayersMapProps {
  additionalLayers?: BaseLayer[];
  initialCenter?: LongitudeLatitude | null;
  initialZoom?: number;
  /** 이미 EPSG:3857로 변환된 경로의 범위. 최초 표시 시 전체 경로를 맞춘다. */
  initialExtent?: Extent;
  /** 경로에 맞출 때 지도 위를 덮는 패널의 실제 영역을 제외한다. */
  fitObstructionRef?: RefObject<HTMLElement | null>;
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
  initialExtent,
  fitObstructionRef,
  onMapClick,
  onControllerChange,
  targetRef,
}: OpenLayersMapProps) {
  const [baseMap, setBaseMap] = useState<BaseMapType>('street');
  const baseMapRef = useRef<BaseMapType>('street');
  const [terrainBridge, setTerrainBridge] = useState<TerrainMapBridge | null>(null);
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

    const viewListeners = new Set<(state: MapViewState) => void>();

    const readView = (): MapViewState | null => {
      const center = view.getCenter();
      const zoom = view.getZoom();

      if (!center || zoom === undefined) return null;

      const [longitude, latitude] = toLonLat(center, 'EPSG:3857');
      return { center: [longitude, latitude], zoom };
    };

    let viewRevision = 0;

    const refreshMapState = () => {
      const size = map.getSize();
      const zoom = view.getZoom();
      const center = view.getCenter();

      target.dataset.mapReady = 'true';
      target.dataset.mapBaseLayer = baseMapRef.current;
      target.dataset.mapProjection = view.getProjection().getCode();

      if (center) {
        const [longitude, latitude] = toLonLat(center, 'EPSG:3857');
        target.dataset.mapCenter = `${longitude.toFixed(6)},${latitude.toFixed(6)}`;
      } else {
        delete target.dataset.mapCenter;
      }

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

    let userAdjustedView = false;
    let hasFittedExtent = false;

    const markUserAdjustedView = () => {
      userAdjustedView = true;
    };

    const fitInitialExtent = () => {
      if (!initialExtent || userAdjustedView || (hasFittedExtent && !fitObstructionRef)) return;

      const mapRect = target.getBoundingClientRect();
      if (mapRect.width === 0 || mapRect.height === 0) return;

      const panelRect = fitObstructionRef?.current?.getBoundingClientRect();
      const overlaps =
        panelRect &&
        panelRect.width > 0 &&
        panelRect.height > 0 &&
        panelRect.left < mapRect.right &&
        panelRect.right > mapRect.left &&
        panelRect.top < mapRect.bottom &&
        panelRect.bottom > mapRect.top;

      const coveredHeight = overlaps ? mapRect.bottom - Math.max(mapRect.top, panelRect.top) : 0;
      const bottomPadding = Math.min(32 + coveredHeight, Math.max(32, mapRect.height - 64));

      view.fit(initialExtent, {
        padding: [32, 32, bottomPadding, 32],
        maxZoom: MAX_ZOOM,
      });
      hasFittedExtent = true;
    };

    const updateSize = () => {
      map.updateSize();
      fitInitialExtent();
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
    if (fitObstructionRef?.current) {
      resizeObserver?.observe(fitObstructionRef.current);
    }

    window.addEventListener('resize', updateSize);

    // 첫 직접 조작 뒤에는 패널·화면 크기가 바뀌어도 자동 맞춤으로 시점을 덮어쓰지 않는다.
    target.addEventListener('pointerdown', markUserAdjustedView, true);
    target.addEventListener('wheel', markUserAdjustedView, { passive: true, capture: true });
    target.addEventListener('keydown', markUserAdjustedView, true);

    const initialSizeFrame = window.requestAnimationFrame(updateSize);

    setTerrainBridge({
      readView,
      applyView: (state) => {
        if (!isActive || baseMapRef.current !== 'terrain') return;

        markUserAdjustedView();
        view.cancelAnimations();
        view.setCenter(fromLonLat([...state.center], 'EPSG:3857'));
        view.setZoom(state.zoom);
        refreshMapState();
      },
      subscribe: (listener) => {
        viewListeners.add(listener);
        return () => {
          viewListeners.delete(listener);
        };
      },
    });

    const controller: MapController = {
      centerOn: (coordinate, zoom = INITIAL_ZOOM + 1) => {
        if (!isActive || !isValidCoordinate(coordinate)) {
          return false;
        }

        const targetZoom = Number.isFinite(zoom) ? zoom : INITIAL_ZOOM + 1;
        markUserAdjustedView();

        if (baseMapRef.current === 'terrain') {
          const state: MapViewState = {
            center: coordinate,
            zoom: Math.min(MAX_ZOOM, Math.max(2, targetZoom)),
          };

          view.cancelAnimations();
          view.setCenter(fromLonLat([...coordinate], 'EPSG:3857'));
          view.setZoom(state.zoom);
          refreshMapState();
          viewListeners.forEach((listener) => listener(state));
          return true;
        }

        view.animate({
          center: fromLonLat([...coordinate]),
          duration: 180,
          zoom: Math.min(MAX_ZOOM, Math.max(2, targetZoom)),
        });

        return true;
      },
      isBaseMapAvailable: (type) => type === 'street' || Boolean(VWORLD_KEY),
      setBaseMap: (type) => {
        if (!isActive || (type !== 'street' && !VWORLD_KEY)) {
          return false;
        }

        if (type === 'terrain') {
          if (!readView()) return false;
          markUserAdjustedView();
        }

        view.cancelAnimations();
        baseMapRef.current = type;
        setBaseMap(type);

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
      viewListeners.clear();
      window.cancelAnimationFrame(initialSizeFrame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSize);
      target.removeEventListener('pointerdown', markUserAdjustedView, true);
      target.removeEventListener('wheel', markUserAdjustedView, true);
      target.removeEventListener('keydown', markUserAdjustedView, true);
      unByKey(moveEndKey);
      unByKey(mapClickKey);
      onControllerChangeRef.current?.(null);
      delete target.dataset.mapReady;
      delete target.dataset.mapBaseLayer;
      delete target.dataset.mapProjection;
      delete target.dataset.mapCenter;
      delete target.dataset.mapZoom;
      delete target.dataset.mapSize;
      delete target.dataset.mapViewRevision;
      map.setTarget(undefined);
      map.dispose();
    };
  }, [additionalLayers, initialCenter, initialExtent, initialZoom, targetRef, fitObstructionRef]);

  return baseMap === 'terrain' && terrainBridge ? (
    <InlineTerrainMap bridge={terrainBridge} />
  ) : null;
}