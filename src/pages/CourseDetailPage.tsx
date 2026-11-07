import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import backIcon from '@/assets/course/course-back.svg';
import { Button } from '@/components/ui';

import {
  CourseTerrainAnalysisPanel,
  MockElevationProfileSection,
  NearbyFacilitiesPanel,
  TerrainAnalysisPanel,
  terrainAnalysisConfig,
  useTerrainAnalysis,
} from '@/features/analysis';

import type { TerrainAnalysisConditions } from '@/features/analysis';

import { useAuth } from '@/features/auth';

import {
  CourseDetailPanel,
  MyCoursesNavigation,
  useCourseDetailState,
  useCourseLayer,
  useCourseDeleteState,
  CourseDeleteDialog,
} from '@/features/course';

import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import { CourseExportDialog, RouteEditDialog } from '@/features/route';

import '@/features/analysis/analysis.css';
import '@/features/course/components/my-courses.css';

import './my-courses.css';
import './course-detail.css';

/** 인증·현재 코스·분석을 조합하며 탭 전환 중에도 하나의 분석 실행을 유지한다. */
export function CourseDetailPage() {
  const { courseId } = useParams();
  return <CourseDetailWorkspace key={courseId} />;
}

function CourseDetailWorkspace() {
  const { currentUser } = useAuth();
  const state = useCourseDetailState();
  const location = useLocation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRegionRef = useRef<HTMLElement>(null);

  const [controller, setController] = useState<MapController | null>(null);
  const [isEditOpen, setEditOpen] = useState(false);

  const course = state.course;
  const deletion = useCourseDeleteState(state.backHref);
  const courseLayer = useCourseLayer(state.isMock ? undefined : course?.geometry);
  const targetRef = mapContainerRef;

  const conditions: TerrainAnalysisConditions | null =
    course && !state.isMock && terrainAnalysisConfig
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
    state.mockCourse ? (
      <TerrainAnalysisPanel
        candidateName={state.mockCourse.name}
        mockData={{
          distanceM: state.mockCourse.distanceM,
          elevationGainM: state.mockCourse.elevationGainM,
        }}
      />
    ) : (
      <CourseTerrainAnalysisPanel
        courseName={course.courseName}
        phase={analysis.phase}
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
    )
  ) : null;

  return (
    <div className="course-detail-page">
      <header className="my-courses-site-header">
        <div className="my-courses-site-header__inner">
          <Link aria-label="내 코스 목록으로" className="course-detail-back" to={state.backHref}>
            <img alt="" aria-hidden="true" src={backIcon} />
            <span>내 코스로</span>
          </Link>

          <div aria-label="코스 관리" className="course-detail-actions">
            {state.mockCourse ? (
              <Button onClick={() => setEditOpen(true)} size="sm" variant="secondary">
                편집
              </Button>
            ) : state.snapshot?.etag && !state.isUnavailable ? (
              <Link
                className="orda-button orda-button--secondary orda-button--sm"
                to={state.editHref}
              >
                편집
              </Link>
            ) : (
              <Button disabled size="sm" variant="secondary">
                편집
              </Button>
            )}

            <Button
              disabled={!state.mockCourse}
              onClick={() => state.setExportOpen(true)}
              size="sm"
              variant="secondary"
            >
              내보내기
            </Button>
            <Button
              disabled={state.isUnavailable || !state.snapshot?.etag || deletion.pending}
              size="sm"
              variant="danger"
              onClick={() => {
                if (state.snapshot) deletion.open(state.snapshot);
              }}
            >
              삭제
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
              {state.isMockPreviewError
                ? '예시 상세 다시 보기'
                : state.isFetching
                  ? '다시 불러오는 중…'
                  : '다시 시도'}
            </Button>
          ) : null}

          <Link to={state.backHref}>내 코스 목록으로 돌아가기</Link>
        </main>
      ) : course ? (
        <main className="course-detail-workspace">
          <section
            aria-label="저장된 코스 경로 지도"
            className="course-detail-map"
            id="course-detail-map"
            ref={mapRegionRef}
            tabIndex={-1}
          >
            {state.isMock ? (
              <>
                <div className="orda-map-layout__map-surface" ref={targetRef}>
                  <OpenLayersMap onControllerChange={setController} targetRef={targetRef} />
                </div>
                <span className="course-detail-map__note">
                  {state.mockCourse?.mountainName} · 실제 경로 미제공
                </span>
                <div className="course-detail-map__controls">
                  <MapControls controller={controller} />
                </div>
              </>
            ) : courseLayer ? (
              <>
                <div className="orda-map-layout__map-surface" ref={targetRef}>
                  <OpenLayersMap
                    additionalLayers={courseLayer.layers}
                    initialCenter={null}
                    initialExtent={courseLayer.extent}
                    onControllerChange={setController}
                    targetRef={targetRef}
                  />
                </div>
                <div className="course-detail-map__controls">
                  <MapControls controller={controller} />
                </div>
              </>
            ) : (
              <p role="alert">표시할 수 있는 코스 경로가 없습니다.</p>
            )}
          </section>

          <section aria-label="내 코스 상세 내용" className="course-detail-content">
            {state.snapshot?.etag === null ? (
              <div role="status">
                <p>편집에 필요한 버전 정보를 받지 못했습니다. 상세 정보를 다시 조회해주세요.</p>
                <Button onClick={state.retry} variant="secondary">
                  상세 다시 조회
                </Button>
              </div>
            ) : null}
            <CourseDetailPanel
              course={course}
              mockCourse={state.mockCourse}
              onTabChange={state.setTab}
              tab={state.tab}
              overviewAnalysis={
                state.mockCourse ? (
                  <MockElevationProfileSection />
                ) : state.tab === 'overview' ? (
                  analysisPanel
                ) : null
              }
              terrainContent={state.tab === 'terrain' ? analysisPanel : null}
              facilitiesContent={
                state.mockCourse ? (
                  <NearbyFacilitiesPanel candidateName={state.mockCourse.name} mockData />
                ) : state.tab === 'facilities' ? (
                  <section aria-label="주변 시설 안내" className="insights-panel">
                    <div className="insights-empty" role="status">
                      <strong>주변 시설 정보 미제공</strong>
                      <p>이 코스의 주변 시설 정보가 아직 연결되지 않았어요.</p>
                    </div>
                  </section>
                ) : null
              }
            />
            {!state.isMock ? (
              <p className="my-courses-demo-note">내보내기는 아직 제공하지 않습니다.</p>
            ) : null}
          </section>
        </main>
      ) : (
        <main className="my-courses-feedback">
          <p role="status">코스 정보를 확인하고 있어요.</p>
        </main>
      )}

      <MyCoursesNavigation />
      <CourseDeleteDialog state={deletion} />
      {state.mockCourse && isEditOpen ? (
        <RouteEditDialog
          candidate={{ name: state.mockCourse.name, memo: state.mockCourse.description }}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
      {state.mockCourse && state.isExportOpen ? (
        <CourseExportDialog courseName={state.mockCourse.name} onOpenChange={state.setExportOpen} />
      ) : null}
    </div>
  );
}
