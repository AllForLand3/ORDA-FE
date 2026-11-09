import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import bookmarkIcon from '@/assets/route/bookmark-navigation.svg';
import mountainIcon from '@/assets/route/mountain-navigation.svg';
import routeIcon from '@/assets/route/route-navigation.svg';
import { MapPageLayout } from '@/components/layout';
import {
  NearbyFacilitiesPanel,
  TerrainAnalysisPanel,
  useNearbyPlacesLayer,
  useRouteNearby,
} from '@/features/analysis';
import type { NearbyPlace } from '@/features/analysis';
import { useAuth } from '@/features/auth';
import { MountainHeader } from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import type { RouteCandidateNearbyCounts, RouteSearchRequest } from '@/features/route';
import {
  RouteResultsPanel,
  RouteSearchResultsPanel,
  useRouteCandidateLayer,
  useRouteResultsState,
  useRouteSearchRequest,
  useRouteSearchResultsState,
} from '@/features/route';
import '@/features/route/route-results.css';
import '@/features/analysis/analysis.css';

import './route-results.css';

// 목록에서 시설을 고르면 주변을 알아볼 수 있도록 확대해 이동한다.
const NEARBY_PLACE_ZOOM = 17;

function RouteResultsNavigation() {
  return (
    <div className="route-results-navigation">
      <Link to="/mountains">
        <img alt="" aria-hidden="true" src={mountainIcon} />
        <span>산 탐색</span>
      </Link>
      <Link aria-current="page" className="is-active" to="/routes/results">
        <img alt="" aria-hidden="true" src={routeIcon} />
        <span>맞춤 경로</span>
      </Link>
      <Link to="/my-courses">
        <img alt="" aria-hidden="true" src={bookmarkIcon} />
        <span>내 코스</span>
      </Link>
    </div>
  );
}

export function RouteResultsPage() {
  const searchRequest = useRouteSearchRequest();

  // 산·노드 ID 파라미터가 모두 있을 때만 실제 경로 탐색 API를 쓴다(코스 탐색 설정에서 진입).
  // 그 외에는 기존 예시 코스 화면을 그대로 보여준다.
  return searchRequest ? <RouteSearchResults request={searchRequest} /> : <MockRouteResults />;
}

/** 실제 탐색 결과 화면. 후보 선형, 후보별 주변 시설 수·목록, 시설 위치 지도를 조합한다. */
function RouteSearchResults({ request }: { request: RouteSearchRequest }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const state = useRouteSearchResultsState(request);
  const candidateLayer = useRouteCandidateLayer(
    state.candidates,
    state.selectedCandidate?.rank ?? null,
  );
  // 후보 주변 상세지점·시설 조회. 화면 후보(rank 기준)와 API 후보의 간선 목록을 짝지어 넘긴다.
  const { currentUser } = useAuth();
  const nearbyCandidates = useMemo(
    () =>
      state.candidates.flatMap((candidate) => {
        const view = state.candidateViews.find((item) => item.rank === candidate.rank);
        return view ? [{ id: view.id, edgeIds: candidate.edgeIds }] : [];
      }),
    [state.candidates, state.candidateViews],
  );
  const nearby = useRouteNearby(state.request.mountainId, nearbyCandidates, currentUser?.userId);
  // 조회 전·실패·자료 없음은 0이 아니라 null로 넘겨 카드에 '정보 없음'으로 표시한다.
  // 같은 간선 목록의 결과는 바뀌지 않으므로 재조회 중에도 목록·지도와 같은 결과를 유지한다.
  const nearbyCountsById = new Map<string, RouteCandidateNearbyCounts>(
    nearbyCandidates.map(({ id }) => {
      const query = nearby.get(id);
      const summary = query?.isSuccess ? query.data : undefined;
      return [id, { stairs: summary?.stairs ?? null, facilities: summary?.facilities ?? null }];
    }),
  );
  const selected = state.selectedCandidate;
  const selectedNearby = selected ? nearby.get(selected.id) : undefined;
  // 목록과 지도에서 함께 선택하는 시설. 목록 이름을 누르면 지도를 옮기고, 마커를 누르면 목록을 강조한다.
  // 선택은 후보별로 기억해, 다른 후보로 바꾸면 이전 후보의 선택이 남지 않는다.
  const [placeSelection, setPlaceSelection] = useState<{
    candidateId: string;
    placeKey: string;
  } | null>(null);
  const selectedPlaceKey =
    placeSelection && placeSelection.candidateId === selected?.id ? placeSelection.placeKey : null;
  const selectPlaceKey = (placeKey: string) => {
    if (selected) setPlaceSelection({ candidateId: selected.id, placeKey });
  };
  const selectPlace = (place: NearbyPlace) => {
    selectPlaceKey(place.key);
    if (place.coordinates) controller?.centerOn(place.coordinates, NEARBY_PLACE_ZOOM);
  };
  // 주변 시설 탭에서 선택한 후보의 시설 위치만 지도에 표시한다.
  const nearbyLayer = useNearbyPlacesLayer(
    state.tab === 'facilities' && selectedNearby?.isSuccess
      ? selectedNearby.data.places
      : undefined,
    selectedPlaceKey,
  );
  // 지도는 레이어 배열이 바뀌면 다시 만들어지므로, 고정된 레이어 객체로 배열을 유지한다.
  const layers = useMemo(() => [candidateLayer, nearbyLayer], [candidateLayer, nearbyLayer]);

  return (
    <div
      className={`route-results-page${state.tab !== 'compare' ? ' route-results-page--insights' : ''}`}
    >
      <MapPageLayout
        bottomNavigation={<RouteResultsNavigation />}
        bottomNavigationLabel="코스 결과 내비게이션"
        header={<MountainHeader />}
        mapContainerRef={mapContainerRef}
        mapContent={
          <OpenLayersMap
            additionalLayers={layers}
            onControllerChange={setController}
            onFeatureClick={selectPlaceKey}
            targetRef={mapContainerRef}
          />
        }
        mapControls={<MapControls controller={controller} mountainName="관악산" />}
        mapLabel="경로 탐색 결과의 후보 선형을 표시하는 지도"
        panel={
          <RouteSearchResultsPanel
            facilitiesContent={
              state.tab === 'facilities' && selected && selectedNearby ? (
                <NearbyFacilitiesPanel
                  candidateName={selected.name}
                  key={selected.id}
                  nearby={selectedNearby}
                  onSelectPlace={selectPlace}
                  selectedPlaceKey={selectedPlaceKey}
                />
              ) : undefined
            }
            nearbyCountsById={nearbyCountsById}
            state={state}
          />
        }
        panelLabel="경로 탐색 결과"
        panelCloseText="접기"
        panelSize="expanded"
      />
    </div>
  );
}

function MockRouteResults() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const state = useRouteResultsState();
  const candidateName = state.previewState === 'ready' ? state.selectedCandidate.name : null;

  return (
    <div
      className={`route-results-page${state.tab !== 'compare' ? ' route-results-page--insights' : ''}`}
    >
      <MapPageLayout
        bottomNavigation={<RouteResultsNavigation />}
        bottomNavigationLabel="코스 결과 내비게이션"
        header={<MountainHeader />}
        mapContainerRef={mapContainerRef}
        mapContent={
          <OpenLayersMap onControllerChange={setController} targetRef={mapContainerRef} />
        }
        mapControls={<MapControls controller={controller} mountainName="관악산" />}
        mapLabel="관악산 배경 지도, 예시 코스의 경로 선형은 제공되지 않음"
        panel={
          <RouteResultsPanel
            state={state}
            terrainContent={
              state.tab === 'terrain' ? (
                <TerrainAnalysisPanel
                  candidateName={candidateName}
                  key={state.selectedCandidate.id}
                />
              ) : null
            }
            facilitiesContent={
              state.tab === 'facilities' ? (
                <NearbyFacilitiesPanel
                  candidateName={candidateName}
                  key={state.selectedCandidate.id}
                />
              ) : null
            }
          />
        }
        panelLabel="예시 코스 비교 결과"
        panelCloseText="접기"
        panelSize="expanded"
      />
    </div>
  );
}
