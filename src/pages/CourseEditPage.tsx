import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import backIcon from '@/assets/course/course-back.svg';
import { MapPageLayout } from '@/components/layout';
import { Button } from '@/components/ui';
import { CourseEditDialogs, CourseEditPanel, useCourseEditState } from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';

import './course-edit.css';

export function CourseEditPage() {
  const { courseId } = useParams();
  return <CourseEditWorkspace courseId={courseId} key={courseId} />;
}

function CourseEditWorkspace({ courseId }: { courseId: string | undefined }) {
  const state = useCourseEditState(courseId);
  const targetRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  if (!state.course) {
    return (
      <main className="course-edit-missing">
        <h1>편집할 코스를 찾을 수 없어요</h1>
        <p>예시 목록에 없는 코스 ID입니다.</p>
        <Link to="/my-courses">내 코스 목록으로</Link>
      </main>
    );
  }

  return (
    <div className="course-edit-page">
      <MapPageLayout
        header={
          <div className="course-edit-header">
            <Link to={state.detailHref}>
              <img alt="" aria-hidden="true" src={backIcon} />
              <h1>코스 편집</h1>
            </Link>
            <Button
              form="course-edit-form"
              onClick={() => setPanelOpen(true)}
              size="sm"
              type="submit"
            >
              저장
            </Button>
          </div>
        }
        mapContainerRef={targetRef}
        mapContent={
          <>
            <OpenLayersMap onControllerChange={setController} targetRef={targetRef} />
            <span className="course-edit-map-note">
              {state.course.mountainName} · 실제 경로 미제공
            </span>
          </>
        }
        mapControls={<MapControls controller={controller} />}
        mapLabel="편집 배경 지도, 실제 경로 미제공"
        panel={<CourseEditPanel state={state} />}
        panelLabel="코스 편집 입력"
        onPanelOpenChange={setPanelOpen}
        panelOpen={panelOpen}
        panelSize="expanded"
      />
      <CourseEditDialogs state={state} />
    </div>
  );
}
