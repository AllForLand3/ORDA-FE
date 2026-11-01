import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import Attribution from 'ol/control/Attribution.js';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import { altKeyOnly, singleClick } from 'ol/events/condition.js';
import Map from 'ol/Map.js';
import Modify from 'ol/interaction/Modify.js';
import type BaseLayer from 'ol/layer/Base.js';
import type Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import type VectorLayer from 'ol/layer/Vector.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ.js';
import type VectorSource from 'ol/source/Vector.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import { fromLonLat, toLonLat } from 'ol/proj.js';
import { unByKey } from 'ol/Observable.js';
import type { EventsKey } from 'ol/events.js';
import type { Extent } from 'ol/extent.js';

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

export type EditableLineLayer = VectorLayer<VectorSource<Feature<LineString>>>;

export interface OpenLayersMapProps {
  additionalLayers?: BaseLayer[];
  initialCenter?: LongitudeLatitude | null;
  initialZoom?: number;
  /** 이미 EPSG:3857로 변환된 경로의 범위. 최초 표시 시 전체 경로를 맞춘다. */
  initialExtent?: Extent;
  editableLayer?: EditableLineLayer | null;
  editingEnabled?: boolean;
  onEditableGeometryChange?: (coordinates: readonly LongitudeLatitude[]) => boolean | void;
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
  editableLayer,
  editingEnabled = true,
  onEditableGeometryChange,
  onMapClick,
  onControllerChange,
  targetRef,
}: OpenLayersMapProps) {
  const onControllerChangeRef = useRef(onControllerChange);
  const onMapClickRef = useRef(onMapClick);
  const onEditableGeometryChangeRef = useRef(onEditableGeometryChange);
  const editingEnabledRef = useRef(editingEnabled);
  const setEditingEnabledRef = useRef<((enabled: boolean) => void) | null>(null);

  useEffect(() => {
    editingEnabledRef.current = editingEnabled;
    setEditingEnabledRef.current?.(editingEnabled);
  }, [editingEnabled]);

  useEffect(() => {
    onControllerChangeRef.current = onControllerChange;
  }, [onControllerChange]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onEditableGeometryChangeRef.current = onEditableGeometryChange;
  }, [onEditableGeometryChange]);

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

    const editableSource = editableLayer?.getSource();
    const modifyInteraction = editableSource
      ? new Modify({
          source: editableSource,
          deleteCondition: (event) => altKeyOnly(event) && singleClick(event),
        })
      : null;
    const initialGeometry = editableSource?.getFeatures()[0]?.getGeometry();
    let previousCoordinates =
      initialGeometry instanceof LineString
        ? initialGeometry.getCoordinates().map(([x, y]) => [x, y])
        : undefined;
    let isModifying = false;
    const refreshPreviousCoordinates = () => {
      if (isModifying) return;
      const geometry = editableSource?.getFeatures()[0]?.getGeometry();
      if (geometry instanceof LineString) {
        previousCoordinates = geometry.getCoordinates().map(([x, y]) => [x, y]);
      }
    };
    const sourceChangeKey = editableSource?.on('changefeature', refreshPreviousCoordinates);
    const modifyStartKey = modifyInteraction?.on('modifystart', () => {
      refreshPreviousCoordinates();
      isModifying = true;
    });
    const restoreGeometry = () => {
      const geometry = editableSource?.getFeatures()[0]?.getGeometry();
      if (geometry && previousCoordinates) geometry.setCoordinates(previousCoordinates);
      isModifying = false;
    };
    setEditingEnabledRef.current = (enabled) => {
      if (!enabled && isModifying) restoreGeometry();
      modifyInteraction?.setActive(enabled);
    };
    setEditingEnabledRef.current(editingEnabledRef.current);
    const modifyEndKey = modifyInteraction
      ? modifyInteraction.on('modifyend', () => {
          const feature = editableSource?.getFeatures()[0];
          const geometry = feature?.getGeometry();
          if (!(geometry instanceof LineString)) {
            isModifying = false;
            return;
          }
          if (!editingEnabledRef.current) {
            restoreGeometry();
            return;
          }

          const projectedCoordinates = geometry.getCoordinates();
          const coordinates = projectedCoordinates.map(([x, y]): LongitudeLatitude => {
            const [longitude, latitude] = toLonLat([x, y], 'EPSG:3857');
            return [longitude, latitude];
          });
          const accepted = onEditableGeometryChangeRef.current?.(coordinates);
          if (accepted === false && previousCoordinates) {
            restoreGeometry();
            return;
          }
          previousCoordinates = projectedCoordinates.map(([x, y]) => [x, y]);
          isModifying = false;
        })
      : null;
    if (modifyInteraction) map.addInteraction(modifyInteraction);

    let viewRevision = 0;
    const refreshMapState = () => {
      const size = map.getSize();
      const zoom = view.getZoom();
      const center = view.getCenter();

      target.dataset.mapReady = 'true';
      target.dataset.mapBaseLayer = satelliteLayer?.getVisible() ? 'satellite' : 'street';
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

    const initialSizeFrame = window.requestAnimationFrame(() => {
      updateSize();
      if (initialExtent) {
        view.fit(initialExtent, { padding: [32, 32, 32, 32], maxZoom: MAX_ZOOM });
        refreshMapState();
      }
    });
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
      if (modifyEndKey) unByKey(modifyEndKey);
      if (modifyStartKey) unByKey(modifyStartKey);
      if (sourceChangeKey) unByKey(sourceChangeKey);
      if (modifyInteraction) map.removeInteraction(modifyInteraction);
      modifyInteraction?.dispose();
      setEditingEnabledRef.current = null;
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
  }, [additionalLayers, editableLayer, initialCenter, initialExtent, initialZoom, targetRef]);

  return null;
}
