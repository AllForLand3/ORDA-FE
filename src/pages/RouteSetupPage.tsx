import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { MapPageLayout } from '@/components/layout/MapPageLayout';
import backIcon from '@/assets/course/course-back.svg';
import {
  MOUNTAIN_MOCKS,
  MountainHeader,
  isValidMountainCoordinate,
  isValidMountainId,
  useMountainDetailQuery,
} from '@/features/course';
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
  const usesApiMountain = mountainId !== null && !fallbackMountain;
  const hasInvalidMountainId = usesApiMountain && !isValidMountainId(mountainId);
  const mountainDetailQuery = useMountainDetailQuery(
    usesApiMountain && isValidMountainId(mountainId) ? mountainId : null,
  );
  const selectedMountainName = mountainDetailQuery.data?.mountainName ?? fallbackMountain?.name;
  const selectedMountainCoordinates =
    mountainDetailQuery.data?.geometry?.coordinates ?? fallbackMountain?.coordinates;
  const isMountainLocationPending =
    usesApiMountain &&
    !hasInvalidMountainId &&
    (mountainDetailQuery.isPending || mountainDetailQuery.isFetching);
  const hasMountainLocationError =
    usesApiMountain &&
    (hasInvalidMountainId ||
      mountainDetailQuery.isError ||
      (Boolean(mountainDetailQuery.data) &&
        !isValidMountainCoordinate(selectedMountainCoordinates)));
  const canConfigure =
    !usesApiMountain ||
    Boolean(
      mountainDetailQuery.isSuccess &&
      !mountainDetailQuery.isFetching &&
      !mountainDetailQuery.isError &&
      mountainDetailQuery.data.serviceAvailable === true &&
      isValidMountainCoordinate(selectedMountainCoordinates),
    );
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapController, setMapController] = useState<MapController | null>(null);
  const state = useRouteSetupState();
  const { originNodeId, destinationNodeId, originSnap, destinationSnap, pendingSnap } = state;
  // 확정 지점은 URL의 노드 ID와 같은 스냅 결과일 때만 스냅 위치를 그린다.
  const snapped = useMemo(
    () => ({
      origin:
        originSnap.data && originSnap.data.nodeId === originNodeId
          ? originSnap.data.coordinates
          : null,
      destination:
        destinationSnap.data && destinationSnap.data.nodeId === destinationNodeId
          ? destinationSnap.data.coordinates
          : null,
      pending: pendingSnap.data?.coordinates ?? null,
    }),
    [destinationNodeId, destinationSnap.data, originNodeId, originSnap.data, pendingSnap.data],
  );
  const markerLayer = useRouteMarkerLayer(
    state.origin,
    state.destination,
    state.pendingPlace,
    snapped,
  );
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
    if (
      usesApiMountain &&
      mountainDetailQuery.isSuccess &&
      !mountainDetailQuery.isFetching &&
      mountainDetailQuery.data?.serviceAvailable === false
    ) {
      navigate('/mountains', { replace: true });
    }
  }, [
    usesApiMountain,
    mountainDetailQuery.isSuccess,
    mountainDetailQuery.isFetching,
    mountainDetailQuery.data,
    navigate,
  ]);

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
          canConfigure ? (
            <OpenLayersMap
              additionalLayers={layers}
              initialCenter={selectedMountainCoordinates}
              onMapClick={(coordinate) => {
                if (!canConfigure || state.step !== 'locations') return;
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
                {hasInvalidMountainId
                  ? '산 ID가 올바르지 않아요.'
                  : isMountainLocationPending
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
        mapLabel="선택한 출발지·도착지와 연결된 등산로 지점을 표시하는 지도"
        mobilePanelSwipeToClose
        panel={
          <fieldset
            aria-label="코스 설정 입력"
            className="route-setup-gate"
            disabled={!canConfigure}
          >
            <RouteSetupPanel state={state} />
          </fieldset>
        }
        panelFooter={
          <fieldset
            aria-label="코스 설정 단계 이동"
            className="route-setup-gate"
            disabled={!canConfigure}
          >
            <RouteSetupFooter state={state} />
          </fieldset>
        }
        panelCloseText="접기"
        panelLabel="코스 탐색 설정"
        panelSize="content"
      />
    </div>
  );
}
