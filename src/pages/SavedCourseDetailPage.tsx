import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import backIcon from '@/assets/course/course-back.svg';
import { Button } from '@/components/ui';
import {
  MyCoursesNavigation,
  SavedCourseDetailPanel,
  useCourseLayer,
  useSavedCourseDetailState,
} from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';

export function SavedCourseDetailPage() {
  const state = useSavedCourseDetailState();
  const course = state.snapshot?.course;
  const courseLayer = useCourseLayer(course?.geometry);
  const targetRef = useRef<HTMLDivElement>(null);
  const mapRegionRef = useRef<HTMLElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#course-detail-map') mapRegionRef.current?.focus();
  }, [location.hash, course?.courseId]);

  return (
    <div className="course-detail-page">
      <header className="my-courses-site-header">
        <div className="my-courses-site-header__inner">
          <Link aria-label="내 코스 목록으로" className="course-detail-back" to={state.backHref}>
            <img alt="" aria-hidden="true" src={backIcon} />
            <span>코스 상세</span>
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
          <p role="status">코스를 불러오는 중입니다.</p>
        </main>
      ) : state.isUnavailable || !course ? (
        <main className="my-courses-feedback">
          <div role="alert">
            <h1>{state.errorTitle}</h1>
            <p>{state.errorMessage}</p>
          </div>
          {state.canRetry ? <Button onClick={state.retry}>다시 시도</Button> : null}
          <Link to={state.backHref}>내 코스 목록으로 돌아가기</Link>
        </main>
      ) : (
        <main className="course-detail-workspace">
          <section
            aria-label="저장된 코스 경로 지도"
            className="course-detail-map"
            id="course-detail-map"
            ref={mapRegionRef}
            tabIndex={-1}
          >
            {courseLayer ? (
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
            <SavedCourseDetailPanel course={course} tab={state.tab} onTabChange={state.setTab} />
            <p className="my-courses-demo-note">편집·내보내기는 아직 제공하지 않습니다.</p>
            {state.snapshot?.etag === null ? (
              <div role="status">
                <p>편집에 필요한 버전 정보를 받지 못했습니다. 상세 정보를 다시 조회해주세요.</p>
                <Button onClick={state.retry} variant="secondary">
                  상세 다시 조회
                </Button>
              </div>
            ) : null}
          </section>
        </main>
      )}
      <MyCoursesNavigation />
    </div>
  );
}
