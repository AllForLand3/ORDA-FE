import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import './terrain-3d.css';

type MapState =
  | { status: 'loading'; message: string }
  | { status: 'ready'; minElevationM: number; maxElevationM: number }
  | { status: 'error'; message: string };

interface FrameMessage {
  type: 'orda-terrain3d';
  status: 'loading' | 'ready' | 'error';
  message?: string;
  minElevationM?: number;
  maxElevationM?: number;
}

const HAS_VWORLD_KEY = Boolean(import.meta.env.VITE_VWORLD_KEY?.trim());

export function Terrain3DPage() {
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const returnTo =
    from?.startsWith('/') && !from.startsWith('//') && !from.includes('\\') ? from : '/mountains';
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [mapState, setMapState] = useState<MapState>(
    HAS_VWORLD_KEY
      ? { status: 'loading', message: 'VWorld 3D 지도를 불러오고 있습니다.' }
      : { status: 'error', message: 'VWorld API 키가 설정되지 않았습니다.' },
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<FrameMessage>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      )
        return;
      const data = event.data;
      if (data?.type !== 'orda-terrain3d') return;

      if (data.status === 'ready') {
        if (typeof data.minElevationM === 'number' && typeof data.maxElevationM === 'number') {
          setMapState({
            status: 'ready',
            minElevationM: data.minElevationM,
            maxElevationM: data.maxElevationM,
          });
        }
      } else {
        setMapState({
          status: data.status,
          message: data.message ?? '3D 지도를 불러오지 못했습니다.',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const retry = () => {
    setMapState({ status: 'loading', message: 'VWorld 3D 지도를 다시 불러오고 있습니다.' });
    setAttempt((current) => current + 1);
  };

  return (
    <main className="terrain-3d">
      <header className="terrain-3d__header">
        <Link className="terrain-3d__back" to={returnTo}>
          ← 2D 지도로 돌아가기
        </Link>
        <div>
          <p className="terrain-3d__eyebrow">ORDA · 3D MAP</p>
          <h1>관악산 3D 지도</h1>
          <p className="terrain-3d__description">
            VWorld 3D 지도에 관악산 부근의 Copernicus DEM 고도를 적용했습니다.
          </p>
        </div>
      </header>

      <section aria-label="3D 지도 뷰어" className="terrain-3d__viewer">
        {HAS_VWORLD_KEY && (
          <iframe
            key={attempt}
            ref={frameRef}
            className="terrain-3d__frame"
            src={`${import.meta.env.BASE_URL}terrain-3d-map.html`}
            title="VWorld 관악산 3D 지도"
          />
        )}
        {mapState.status === 'loading' && (
          <div
            aria-live="polite"
            className="terrain-3d__notice terrain-3d__notice--overlay"
            role="status"
          >
            {mapState.message}
          </div>
        )}
        {mapState.status === 'error' && (
          <div
            className="terrain-3d__notice terrain-3d__notice--overlay terrain-3d__notice--error"
            role="alert"
          >
            <p>{mapState.message}</p>
            {HAS_VWORLD_KEY && (
              <button onClick={retry} type="button">
                다시 시도
              </button>
            )}
          </div>
        )}
        {mapState.status === 'ready' && (
          <div className="terrain-3d__map-label">관악산 DEM 적용</div>
        )}
      </section>

      <aside aria-label="지도 정보" className="terrain-3d__details">
        <div className="terrain-3d__stat">
          <span>DEM 적용 범위</span>
          <strong>관악산 정상 부근 약 6 × 7 km</strong>
        </div>
        <div className="terrain-3d__stat">
          <span>DEM 고도 범위</span>
          <strong>
            {mapState.status === 'ready'
              ? `${Math.round(mapState.minElevationM)}–${Math.round(mapState.maxElevationM)} m`
              : '—'}
          </strong>
        </div>
        <p className="terrain-3d__hint">드래그: 회전 · 휠: 확대 및 축소</p>
        <p className="terrain-3d__source">
          지도: VWorld 3D · 지형: 관악산 부근 Copernicus GLO-30 DSM (EPSG:4326). DEM 적용 범위 밖은
          VWorld 지형입니다.
        </p>
      </aside>
    </main>
  );
}
