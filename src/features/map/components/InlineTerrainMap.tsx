import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { isMapViewState } from '@/shared/mapView';
import type { MapViewState } from '@/shared/mapView';

export interface TerrainMapBridge {
  readView: () => MapViewState | null;
  applyView: (view: MapViewState) => void;
  subscribe: (listener: (view: MapViewState) => void) => () => void;
}

export function InlineTerrainMap({ bridge }: { bridge: TerrainMapBridge }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('3D 지도를 불러오고 있습니다.');

  useEffect(() => {
    let ready = false;
    const sendView = (view: MapViewState) =>
      frame.current?.contentWindow?.postMessage(
        { type: 'orda-terrain3d-set-view', view },
        window.location.origin,
      );
    const timeout = window.setTimeout(() => {
      setStatus('error');
      setMessage('3D 지도의 응답이 없습니다. 다시 시도하거나 일반지도로 전환해주세요.');
    }, 45_000);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow)
        return;
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      if (data.type === 'orda-terrain3d-view' && 'view' in data && isMapViewState(data.view)) {
        bridge.applyView(data.view);
      }
      if (data.type !== 'orda-terrain3d' || !('status' in data)) return;
      if (data.status === 'ready') {
        window.clearTimeout(timeout);
        if (!ready) {
          ready = true;
          const view = bridge.readView();
          if (view) sendView(view);
        }
        setStatus('ready');
      } else if (data.status === 'loading' || data.status === 'error') {
        if (data.status === 'error') window.clearTimeout(timeout);
        setStatus(data.status);
        if ('message' in data && typeof data.message === 'string') setMessage(data.message);
      }
    };
    const unsubscribe = bridge.subscribe((view) => {
      if (ready) sendView(view);
    });
    window.addEventListener('message', receive);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', receive);
      unsubscribe();
    };
  }, [bridge, attempt]);

  return (
    <div className="orda-inline-terrain" aria-label="3D 지도" aria-busy={status === 'loading'}>
      <iframe
        key={attempt}
        ref={frame}
        title="VWorld 3D 지도"
        src={import.meta.env.BASE_URL + 'terrain-3d-map.html?embedded=1'}
      />
      {status !== 'ready' &&
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
