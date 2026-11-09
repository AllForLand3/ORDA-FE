import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import bookmarkIcon from '@/assets/route/bookmark-navigation.svg';
import mountainIcon from '@/assets/route/mountain-navigation.svg';
import routeIcon from '@/assets/route/route-navigation.svg';
import { MapPageLayout } from '@/components/layout';
import { NearbyFacilitiesPanel, TerrainAnalysisPanel } from '@/features/analysis';
import { MountainHeader } from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import type { RouteSearchRequest } from '@/features/route';
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

function RouteSearchResults({ request }: { request: RouteSearchRequest }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const state = useRouteSearchResultsState(request);
  const candidateLayer = useRouteCandidateLayer(
    state.candidates,
    state.selectedCandidate?.rank ?? null,
  );
  const layers = useMemo(() => [candidateLayer], [candidateLayer]);

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
            targetRef={mapContainerRef}
          />
        }
        mapControls={<MapControls controller={controller} mountainName="관악산" />}
        mapLabel="경로 탐색 결과의 후보 선형을 표시하는 지도"
        panel={<RouteSearchResultsPanel state={state} />}
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
