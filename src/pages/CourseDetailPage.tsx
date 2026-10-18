import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import backIcon from '@/assets/course/course-back.svg';
import { Button } from '@/components/ui';
import { NearbyFacilitiesPanel, TerrainAnalysisPanel } from '@/features/analysis';
import { CourseDetailPanel, MyCoursesNavigation, useCourseDetailState } from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import '@/features/analysis/analysis.css';
import '@/features/course/components/my-courses.css';

import './my-courses.css';
import './course-detail.css';

export function CourseDetailPage() {
  const state = useCourseDetailState();
  const location = useLocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRegionRef = useRef<HTMLElement>(null);
  const [controller, setController] = useState<MapController | null>(null);

  useEffect(() => {
    if (location.hash === '#course-detail-map') mapRegionRef.current?.focus();
  }, [location.hash, state.course?.id]);

  return (
    <div className="course-detail-page">
      <header className="my-courses-site-header">
        <div className="my-courses-site-header__inner">
          <Link aria-label="내 코스 목록으로" className="course-detail-back" to={state.backHref}>
            <img alt="" aria-hidden="true" src={backIcon} />
            <span>코스 상세 분석</span>
          </Link>
          <MyCoursesNavigation />
          <div aria-label="코스 관리 기능 준비 중" className="course-detail-actions">
            <Button disabled size="sm" variant="quiet">
              편집
            </Button>
            <Button disabled size="sm" variant="quiet">
              내보내기
            </Button>
          </div>
        </div>
      </header>
      {!state.course || state.isError ? (
        <main className="my-courses-feedback" role={state.isError ? 'alert' : undefined}>
          <h1>{state.isError ? '코스 상세를 표시하지 못했어요' : '코스를 찾을 수 없어요'}</h1>
          <p>
            {state.isError
              ? '오류 UI 데모입니다. 실제 서버 요청이 실패한 상태는 아닙니다.'
              : '예시 목록에 없는 코스 ID입니다.'}
          </p>
          {state.isError ? (
            <Button onClick={state.retry} variant="secondary">
              예시 상세 다시 보기
            </Button>
          ) : null}
          <Link to={state.backHref}>내 코스 목록으로 돌아가기</Link>
        </main>
      ) : (
        <main className="course-detail-workspace">
          <section
            aria-label="코스 배경 지도, 경로 선형 미제공"
            className="course-detail-map"
            id="course-detail-map"
            ref={mapRegionRef}
            tabIndex={-1}
          >
            <div className="orda-map-layout__map-surface" ref={mapContainerRef}>
              <OpenLayersMap onControllerChange={setController} targetRef={mapContainerRef} />
            </div>
            <span className="course-detail-map__note">
              {state.course.mountainName} · 실제 경로 미제공
            </span>
            <div className="course-detail-map__controls">
              <MapControls controller={controller} />
            </div>
          </section>
          <section aria-label="내 코스 상세 내용" className="course-detail-content">
            <CourseDetailPanel
              course={state.course}
              onTabChange={state.setTab}
              tab={state.tab}
              overviewAnalysis={
                state.tab === 'overview' ? (
                  <TerrainAnalysisPanel
                    candidateName={state.course.name}
                    key={`${state.course.id}-overview`}
                  />
                ) : null
              }
              terrainContent={
                state.tab === 'terrain' ? (
                  <TerrainAnalysisPanel
                    candidateName={state.course.name}
                    key={`${state.course.id}-terrain`}
                  />
                ) : null
              }
              facilitiesContent={
                state.tab === 'facilities' ? (
                  <NearbyFacilitiesPanel candidateName={state.course.name} key={state.course.id} />
                ) : null
              }
            />
          </section>
        </main>
      )}
    </div>
  );
}
