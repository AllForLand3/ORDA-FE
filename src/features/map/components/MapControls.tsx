import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import type { MapController } from './OpenLayersMap';
import type { BaseMapType } from './OpenLayersMap';
import type { LongitudeLatitude } from './OpenLayersMap';

import './openlayers-map.css';

export interface MapControlsProps {
  controller: MapController | null;
}

function StreetMapIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <path
        d="m3.5 5.5 5-2.5 7 2.5 5-2.5v15.5l-5 2.5-7-2.5-5 2.5V5.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M8.5 3v15.5M15.5 5.5V21" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function SatelliteMapIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.2 15.2c-1.6-1.6.5-6.2 4.7-10.4M19.8 8.8c1.6 1.6-.5 6.2-4.7 10.4M8.8 19.8c-1.6 1.6-6.2-.5-4.6-4.6M15.2 4.2c1.6-1.6 6.2.5 4.6 4.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <circle cx="5" cy="5" fill="currentColor" r="1.35" />
    </svg>
  );
}

function hasValidPosition(
  position: GeolocationPosition | null | undefined,
): LongitudeLatitude | null {
  const longitude = position?.coords?.longitude;
  const latitude = position?.coords?.latitude;

  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return [longitude, latitude];
}

function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case 1:
      return '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
    case 2:
      return '현재 위치를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.';
    case 3:
      return '위치 확인 시간이 초과되었습니다. 다시 시도해주세요.';
    default:
      return '현재 위치를 확인하지 못했습니다. 다시 시도해주세요.';
  }
}

export function MapControls({ controller }: MapControlsProps) {
  const [baseMap, setBaseMap] = useState<BaseMapType>('street');
  const [isLocating, setIsLocating] = useState(false);
  const [status, setStatus] = useState('');
  const requestIdRef = useRef(0);
  const terrain3DHref = `/terrain-3d?from=${encodeURIComponent(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  )}`;

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  const handleLocate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('이 브라우저는 위치 기능을 지원하지 않습니다.');
      return;
    }

    if (!controller) {
      setStatus('지도가 준비되면 위치를 확인할 수 있습니다.');
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLocating(true);
    setStatus('현재 위치를 확인하고 있습니다.');

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setIsLocating(false);
          const coordinate = hasValidPosition(position);

          if (!coordinate) {
            setStatus('현재 위치 좌표를 확인하지 못했습니다.');
            return;
          }

          if (controller.centerOn(coordinate)) {
            setStatus('현재 위치로 지도를 이동했습니다.');
          } else {
            setStatus('현재 위치 좌표를 지도에 표시할 수 없습니다.');
          }
        },
        (error) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setIsLocating(false);
          setStatus(getGeolocationErrorMessage(error));
        },
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
      );
    } catch {
      setIsLocating(false);
      setStatus('현재 위치를 확인하지 못했습니다. 브라우저 설정을 확인해주세요.');
    }
  };

  const handleBaseMapChange = (nextBaseMap: BaseMapType) => {
    if (!controller) {
      setStatus('지도가 준비되면 배경지도를 바꿀 수 있습니다.');
      return;
    }

    if (!controller.setBaseMap(nextBaseMap)) {
      setStatus('위성지도를 사용하려면 VWorld API 키를 설정해주세요.');
      return;
    }

    setBaseMap(nextBaseMap);
    setStatus(
      nextBaseMap === 'satellite' ? '위성지도로 전환했습니다.' : '일반지도로 전환했습니다.',
    );
  };

  return (
    <div className="orda-map-controls">
      <Button
        aria-label="현재 위치로 이동"
        className="orda-map-controls__button"
        disabled={!controller || isLocating}
        onClick={handleLocate}
        size="sm"
        variant="secondary"
      >
        {isLocating ? '위치 확인 중' : '내 위치'}
      </Button>
      <div aria-label="배경지도 선택" className="orda-map-controls__map-type-switcher" role="group">
        <button
          aria-label="일반지도 보기"
          aria-pressed={baseMap === 'street'}
          className="orda-map-controls__map-type-button"
          disabled={!controller}
          onClick={() => handleBaseMapChange('street')}
          title="일반지도"
          type="button"
        >
          <StreetMapIcon />
        </button>
        <button
          aria-label="위성지도 보기"
          aria-pressed={baseMap === 'satellite'}
          className="orda-map-controls__map-type-button"
          disabled={!controller}
          onClick={() => handleBaseMapChange('satellite')}
          title={
            controller?.isBaseMapAvailable('satellite') === false
              ? 'VWorld API 키가 필요합니다'
              : '위성지도'
          }
          type="button"
        >
          <SatelliteMapIcon />
        </button>
      </div>
      <a
        aria-label="관악산 3D 지도 보기"
        className="orda-map-controls__terrain-link"
        href={terrain3DHref}
      >
        3D
      </a>
      <p aria-live="polite" className="orda-map-controls__status" role="status">
        {status}
      </p>
    </div>
  );
}
