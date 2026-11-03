import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { MapPageLayout } from '@/components/layout/MapPageLayout';
import backIcon from '@/assets/course/course-back.svg';
import { MOUNTAIN_MOCKS, MountainHeader, useMountainDetailQuery } from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import {
  RouteSetupFooter,
  RouteSetupPanel,
  useRouteMarkerLayer,
  useRouteSetupState,
} from '@/features/route';
import '@/features/route/route-setup.css';

import './route-setup.css';

export function RouteSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mountainId = searchParams.get('mountainId');
  const fallbackMountain = MOUNTAIN_MOCKS.find((mountain) => mountain.id === mountainId);
  const usesApiMountain = Boolean(mountainId && !fallbackMountain);
  const mountainDetailQuery = useMountainDetailQuery(
    mountainId && !fallbackMountain ? mountainId : null,
  );
  const selectedMountainName = mountainDetailQuery.data?.mountainName ?? fallbackMountain?.name;
  const selectedMountainCoordinates =
    mountainDetailQuery.data?.geometry?.coordinates ?? fallbackMountain?.coordinates;
  const isMountainLocationPending = usesApiMountain && mountainDetailQuery.isPending;
  const hasMountainLocationError =
    usesApiMountain &&
    (mountainDetailQuery.isError ||
      (Boolean(mountainDetailQuery.data) && !mountainDetailQuery.data?.geometry));
  const canRenderMap =
    !usesApiMountain ||
    Boolean(
      mountainDetailQuery.data?.serviceAvailable && mountainDetailQuery.data.geometry?.coordinates,
    );
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapController, setMapController] = useState<MapController | null>(null);
  const state = useRouteSetupState();
  const markerLayer = useRouteMarkerLayer(state.origin, state.destination, state.pendingPlace);
  const layers = useMemo(() => [markerLayer], [markerLayer]);
  const focusedPlace = state.pendingPlace ?? state.origin ?? state.destination;

  function goBack() {
    if (state.searchRole || state.pendingPlace || state.isMapSelectionMode) {
      state.closeSearch();
    } else if (state.step === 'conditions') {
      state.setStep('difficulty');
    } else if (state.step === 'difficulty') {
      state.setStep('locations');
    } else {
      navigate('/mountains');
    }
  }

  useEffect(() => {
    if (focusedPlace) {
      mapController?.centerOn(focusedPlace.coordinates, 14);
    }
  }, [focusedPlace, mapController]);

  useEffect(() => {
    if (!focusedPlace && selectedMountainCoordinates) {
      mapController?.centerOn(selectedMountainCoordinates, 14);
    }
  }, [focusedPlace, mapController, selectedMountainCoordinates]);

  useEffect(() => {
    if (mountainDetailQuery.data && !mountainDetailQuery.data.serviceAvailable) {
      navigate('/mountains', { replace: true });
    }
  }, [mountainDetailQuery.data, navigate]);

  return (
    <div className="route-setup-page">
      <MapPageLayout
        header={
          <>
            <div className="route-setup-mobile-header">
              <button
                aria-label="뒤로 가기"
                className="route-setup-mobile-back"
                onClick={goBack}
                type="button"
              >
                <img alt="" aria-hidden="true" src={backIcon} />
              </button>
              <strong>코스 탐색 설정</strong>
            </div>

            <div className="route-setup-desktop-header">
              <MountainHeader />
            </div>
          </>
        }
        mapContainerRef={mapContainerRef}
        mapContent={
          canRenderMap ? (
            <OpenLayersMap
              additionalLayers={layers}
              initialCenter={selectedMountainCoordinates}
              onMapClick={(coordinate) => {
                if (state.step !== 'locations') return;
                if (state.searchRole && state.isMapSelectionMode) {
                  state.setPendingCoordinate(state.searchRole, coordinate);
                }
              }}
              onControllerChange={setMapController}
              targetRef={mapContainerRef}
            />
          ) : (
            <div
              className="orda-map-layout__placeholder"
              role={isMountainLocationPending ? 'status' : 'alert'}
            >
              <strong>
                {isMountainLocationPending
                  ? '산 위치를 확인하는 중이에요.'
                  : '산 위치를 표시할 수 없어요.'}
              </strong>
              <span>
                {hasMountainLocationError
                  ? '산 선택 화면으로 돌아가 다시 선택해 주세요.'
                  : '잠시만 기다려 주세요.'}
              </span>
            </div>
          )
        }
        mapControls={<MapControls controller={mapController} mountainName={selectedMountainName} />}
        mapLabel="예시 출발지와 도착지를 표시하는 지도"
        mobilePanelSwipeToClose
        panel={<RouteSetupPanel state={state} />}
        panelFooter={<RouteSetupFooter state={state} />}
        panelCloseText="접기"
        panelLabel="코스 탐색 설정"
        panelSize="content"
      />
    </div>
  );
}
