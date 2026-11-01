import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { MapPageLayout } from '@/components/layout/MapPageLayout';
import backIcon from '@/assets/course/course-back.svg';
import { MOUNTAIN_MOCKS, MountainHeader } from '@/features/course';
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
  const selectedMountain = MOUNTAIN_MOCKS.find((mountain) => mountain.id === mountainId);
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
          <OpenLayersMap
            additionalLayers={layers}
            initialCenter={selectedMountain?.coordinates}
            onMapClick={(coordinate) => {
              if (state.step !== 'locations') return;
              if (state.searchRole && state.isMapSelectionMode) {
                state.setPendingCoordinate(state.searchRole, coordinate);
              }
            }}
            onControllerChange={setMapController}
            targetRef={mapContainerRef}
          />
        }
        mapControls={
          <MapControls controller={mapController} mountainName={selectedMountain?.name} />
        }
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
