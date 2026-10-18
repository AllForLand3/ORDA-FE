import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import logoMark from '@/assets/home/logo-mark.png';
import bookmarkIcon from '@/assets/route/bookmark-navigation.svg';
import mountainIcon from '@/assets/route/mountain-navigation.svg';
import routeIcon from '@/assets/route/route-navigation.svg';
import { MapPageLayout } from '@/components/layout';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import { RESULT_PREVIEW_STATES, RouteResultsPanel, useRouteResultsState } from '@/features/route';
import '@/features/route/route-results.css';

import './route-results.css';

export function RouteResultsPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const state = useRouteResultsState();

  return (
    <div className="route-results-page">
      <MapPageLayout
        bottomNavigation={
          <div className="route-results-navigation">
            <Link to="/mountains">
              <img alt="" aria-hidden="true" src={mountainIcon} />
              <span>산 탐색</span>
            </Link>
            <Link aria-current="page" className="is-active" to="/routes/results">
              <img alt="" aria-hidden="true" src={routeIcon} />
              <span>맞춤 경로</span>
            </Link>
            <span aria-disabled="true" aria-label="내 코스, 준비 중">
              <img alt="" aria-hidden="true" src={bookmarkIcon} />
              <span>내 코스</span>
            </span>
          </div>
        }
        bottomNavigationLabel="코스 결과 내비게이션"
        header={
          <div className="route-results-header">
            <div className="route-results-header__brand">
              <Link aria-label="ORDA 홈" className="route-results-header__logo" to="/">
                <img alt="" src={logoMark} />
              </Link>
              <Link className="route-results-header__back" to={state.setupHref}>
                ← 조건 변경
              </Link>
              <Link className="route-results-header__login" to="/login">
                로그인
              </Link>
            </div>
            <div className="route-results-header__context">
              <span className="route-results-header__location">
                관악산 <small>예시 코스</small>
              </span>
              <label className="route-results-header__preview">
                <span className="sr-only">화면 상태 미리보기</span>
                <select
                  onChange={(event) => state.setPreviewState(event.target.value)}
                  value={state.previewState}
                >
                  {RESULT_PREVIEW_STATES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="route-results-header__note">실제 추천·경로 선형 미제공</p>
          </div>
        }
        mapContainerRef={mapContainerRef}
        mapContent={
          <OpenLayersMap onControllerChange={setController} targetRef={mapContainerRef} />
        }
        mapControls={<MapControls controller={controller} />}
        mapLabel="관악산 배경 지도, 예시 코스의 경로 선형은 제공되지 않음"
        panel={<RouteResultsPanel state={state} />}
        panelLabel="예시 코스 비교 결과"
        panelSize="expanded"
      />
    </div>
  );
}
