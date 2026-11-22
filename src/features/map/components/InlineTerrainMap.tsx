import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { isMapViewState } from '@/shared/mapView';
import type { MapViewState } from '@/shared/mapView';

import type BaseLayer from 'ol/layer/Base.js';
import { unByKey } from 'ol/Observable.js';
import { readTerrainLines } from '../readTerrainLines';

export interface TerrainMapBridge {
  readView: () => MapViewState | null;
  applyView: (view: MapViewState) => void;
  subscribe: (listener: (view: MapViewState) => void) => () => void;
}

export function InlineTerrainMap({
  active,
  bridge,
  layers,
}: {
  active: boolean;
  bridge: TerrainMapBridge;
  layers: BaseLayer[];
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('3D 지도를 불러오고 있습니다.');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setStatus('error');
      setMessage('3D 지도의 응답이 없습니다. 다시 시도하거나 일반지도로 전환해주세요.');
    }, 45_000);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow)
        return;
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      if (data.type !== 'orda-terrain3d' || !('status' in data)) return;
      if (data.status === 'ready') {
        window.clearTimeout(timeout);
        setStatus('ready');
      } else if (data.status === 'loading' || data.status === 'error') {
        if (data.status === 'error') window.clearTimeout(timeout);
        setStatus(data.status);
        if ('message' in data && typeof data.message === 'string') setMessage(data.message);
      }
    };
    window.addEventListener('message', receive);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', receive);
    };
  }, [attempt]);

  useEffect(() => {
    if (status !== 'ready') return;
    const target = frame.current?.contentWindow;
    if (!target) return;
    const origin = window.location.origin;
    target.postMessage({ type: 'orda-terrain3d-active', active }, origin);
    if (!active) return;
    const sendLines = () =>
      target.postMessage({ type: 'orda-terrain3d-lines', lines: readTerrainLines(layers) }, origin);
    const sendView = (view: MapViewState) =>
      target.postMessage({ type: 'orda-terrain3d-set-view', view }, origin);
    const receive = (event: MessageEvent) => {
      if (
        event.origin === origin &&
        event.source === target &&
        event.data?.type === 'orda-terrain3d-view' &&
        isMapViewState(event.data.view)
      ) {
        bridge.applyView(event.data.view);
      }
    };
    window.addEventListener('message', receive);
    const view = bridge.readView();
    if (view) sendView(view);
    sendLines();
    const keys = layers.map((layer) => layer.on('change', sendLines));
    const unsubscribe = bridge.subscribe(sendView);
    return () => {
      window.removeEventListener('message', receive);
      unByKey(keys);
      unsubscribe();
    };
  }, [active, bridge, layers, status]);

  return (
    <div
      hidden={!active}
      className="orda-inline-terrain"
      aria-label="3D 지도"
      aria-busy={status === 'loading'}
    >
      <iframe
        key={attempt}
        ref={frame}
        title="VWorld 3D 지도"
        src={import.meta.env.BASE_URL + 'terrain-3d-map.html?embedded=1'}
      />
      {active &&
        status !== 'ready' &&
        createPortal(
          <div
            className="orda-inline-terrain__notice"
            role={status === 'error' ? 'alert' : 'status'}
          >
            <p>{message}</p>
            {status === 'error' && (
              <button
                type="button"
                onClick={() => {
                  setStatus('loading');
                  setMessage('3D 지도를 다시 불러오고 있습니다.');
                  setAttempt((value) => value + 1);
                }}
              >
                다시 시도
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
