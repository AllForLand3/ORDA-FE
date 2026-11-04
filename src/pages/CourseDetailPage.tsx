import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import backIcon from '@/assets/course/course-back.svg';
import { Button } from '@/components/ui';

import {
  CourseTerrainAnalysisPanel,
  terrainAnalysisConfig,
  useTerrainAnalysis,
} from '@/features/analysis';

import type { TerrainAnalysisConditions } from '@/features/analysis';

import { useAuth } from '@/features/auth';

import { CourseDetailPanel, MyCoursesNavigation, useCourseDetailState } from '@/features/course';

import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';

import '@/features/analysis/analysis.css';
import '@/features/course/components/my-courses.css';

import './my-courses.css';
import './course-detail.css';

/** 인증·현재 코스·분석을 조합하며 탭 전환 중에도 하나의 분석 실행을 유지한다. */
export function CourseDetailPage() {
  const { currentUser } = useAuth();
  const state = useCourseDetailState(currentUser?.userId);
  const location = useLocation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRegionRef = useRef<HTMLElement>(null);

  const [controller, setController] = useState<MapController | null>(null);

  const course = state.course;

  const conditions: TerrainAnalysisConditions | null =
    course && terrainAnalysisConfig
      ? {
          courseId: course.courseId,
          revNo: course.revNo,
          demId: terrainAnalysisConfig.demId,
          sampleIntervalM: terrainAnalysisConfig.sampleIntervalM,
        }
      : null;

  const analysis = useTerrainAnalysis(currentUser?.userId, conditions);

  useEffect(() => {
    if (location.hash === '#course-detail-map') {
      mapRegionRef.current?.focus();
    }
  }, [location.hash, course?.courseId]);

  const analysisPanel = course ? (
    <CourseTerrainAnalysisPanel
      courseName={course.courseName}
      phase={analysis.phase}
      result={analysis.result}
      configured={terrainAnalysisConfig !== null}
      message={analysis.message}
      canStart={analysis.canStart}
      canRetry={analysis.canRetry}
      canCheck={analysis.canCheck}
      onStart={() => {
        void analysis.start();
      }}
      onRetry={() => {
        void analysis.retry();
      }}
      onCheck={() => {
        void analysis.check();
      }}
      onRefreshCourse={state.retry}
    />
  ) : null;

  return (
    <div className="course-detail-page">
      <header className="my-courses-site-header">
        <div className="my-courses-site-header__inner">
          <Link aria-label="내 코스 목록으로" className="course-detail-back" to={state.backHref}>
            <img alt="" aria-hidden="true" src={backIcon} />
            <span>코스 상세 분석</span>
          </Link>

          <div aria-label="코스 관리" className="course-detail-actions">
            <Button disabled size="sm" variant="quiet">
              편집
            </Button>

            <Button disabled size="sm" variant="quiet">
              내보내기
            </Button>
          </div>
        </div>
      </header>

      {state.isLoading ? (
        <main className="my-courses-feedback" aria-busy="true">
          <p role="status">코스 정보를 불러오고 있어요.</p>
        </main>
      ) : state.error ? (
        <main className="my-courses-feedback">
          <div role="alert">
            <h1>{state.error.title}</h1>
            <p>{state.error.message}</p>
          </div>

          {state.error.canRetry ? (
            <Button disabled={state.isFetching} onClick={state.retry} variant="secondary">
              {state.isFetching ? '다시 불러오는 중…' : '다시 시도'}
            </Button>
          ) : null}

          <Link to={state.backHref}>내 코스 목록으로 돌아가기</Link>
        </main>
      ) : course ? (
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

            <span className="course-detail-map__note">{course.courseName} · 실제 경로 미제공</span>

            <div className="course-detail-map__controls">
              <MapControls controller={controller} />
            </div>
          </section>

          <section aria-label="내 코스 상세 내용" className="course-detail-content">
            <CourseDetailPanel
              course={course}
              onTabChange={state.setTab}
              tab={state.tab}
              overviewAnalysis={state.tab === 'overview' ? analysisPanel : null}
              terrainContent={state.tab === 'terrain' ? analysisPanel : null}
              facilitiesContent={
                state.tab === 'facilities' ? (
                  <section aria-label="주변 시설 안내" className="insights-panel">
                    <div className="insights-empty" role="status">
                      <strong>주변 시설 정보 미제공</strong>
                      <p>이 코스의 주변 시설 정보가 아직 연결되지 않았어요.</p>
                    </div>
                  </section>
                ) : null
              }
            />
          </section>
        </main>
      ) : (
        <main className="my-courses-feedback">
          <p role="status">코스 정보를 확인하고 있어요.</p>
        </main>
      )}

      <MyCoursesNavigation />
    </div>
  );
}
