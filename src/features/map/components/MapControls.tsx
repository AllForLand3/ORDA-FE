import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

import type { MapController } from './OpenLayersMap';
import type { LongitudeLatitude } from './OpenLayersMap';

import gpsIcon from '@/assets/icons/gps.svg';
import layerIcon from '@/assets/icons/layer.svg';

import './openlayers-map.css';

export interface MapControlsProps {
  controller: MapController | null;
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
  const [isLocating, setIsLocating] = useState(false);
  const [status, setStatus] = useState('');
  const requestIdRef = useRef(0);

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

  return (
    <div className="orda-map-controls">
      <Button
        aria-label={isLocating ? '현재 위치 확인 중' : '현재 위치로 이동'}
        title={isLocating ? '위치 확인 중' : '현재 위치로 이동'}
        className="orda-map-controls__button"
        disabled={!controller || isLocating}
        onClick={handleLocate}
        size="sm"
        variant="secondary"
      >
        <span
          aria-hidden="true"
          className={`orda-map-controls__icon${isLocating ? ' is-locating' : ''}`}
          style={{ maskImage: `url("${gpsIcon}")` }}
        />
      </Button>
      <Button
        aria-label="지도 레이어 선택 (준비되지 않음)"
        title="레이어 선택 (준비 중)"
        className="orda-map-controls__button"
        disabled
        size="sm"
        variant="secondary"
      >
        <span
          aria-hidden="true"
          className="orda-map-controls__icon"
          style={{ maskImage: `url("${layerIcon}")` }}
        />
      </Button>
      <p aria-live="polite" className="orda-map-controls__status" role="status">
        {status}
      </p>
    </div>
  );
}
