import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import backIcon from '@/assets/course/course-back.svg';
import { MapPageLayout } from '@/components/layout';
import { Button } from '@/components/ui';
import {
  CourseEditPanel,
  CourseEditDialogs,
  useCourseDetailState,
  useCourseEditState,
  useCourseLayer,
} from '@/features/course';
import type { CourseSnapshot } from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';

import './course-edit.css';

export function CourseEditPage() {
  const state = useCourseDetailState(true);
  const { courseId } = useParams();
  if (state.isLoading)
    return (
      <main className="course-edit-missing" aria-busy="true">
        <p role="status">코스를 불러오는 중입니다.</p>
      </main>
    );
  if (state.isUnavailable || !state.snapshot)
    return (
      <main className="course-edit-missing">
        <div role="alert">
          <h1>{state.errorTitle}</h1>
          <p>{state.errorMessage}</p>
        </div>
        {state.canRetry ? <Button onClick={state.retry}>다시 시도</Button> : null}
        <Link to={state.backHref}>내 코스 목록으로</Link>
      </main>
    );
  return <CourseEditWorkspace key={courseId} initial={state.snapshot} />;
}

function CourseEditWorkspace({ initial }: { initial: CourseSnapshot }) {
  const state = useCourseEditState(initial);
  const layer = useCourseLayer(state.course.geometry);
  const targetRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [params] = useSearchParams();
  const tab = params.get('tab');
  const detailParams = new URLSearchParams();
  if (tab === 'terrain' || tab === 'facilities') detailParams.set('tab', tab);
  const listPage = params.get('listPage');
  if (listPage && /^[1-9]\d*$/.test(listPage) && Number(listPage) <= 2147483647) {
    detailParams.set('listPage', listPage);
  }
  const detailSearch = detailParams.toString();
  const detailHref =
    '/my-courses/' + state.course.courseId + (detailSearch ? '?' + detailSearch : '');
  return (
    <div className="course-edit-page">
      <MapPageLayout
        header={
          <div className="course-edit-header">
            <Link to={detailHref}>
              <img src={backIcon} alt="" aria-hidden="true" />
              <h1>코스 편집</h1>
            </Link>
            <Button
              form="course-edit-form"
              type="submit"
              disabled={!state.canSave}
              onClick={() => setPanelOpen(true)}
            >
              저장
            </Button>
          </div>
        }
        mapContainerRef={targetRef}
        mapContent={
          layer ? (
            <OpenLayersMap
              targetRef={targetRef}
              additionalLayers={layer.layers}
              initialCenter={null}
              initialExtent={layer.extent}
              onControllerChange={setController}
            />
          ) : (
            <p role="alert">표시할 수 있는 코스 경로가 없습니다.</p>
          )
        }
        mapControls={layer ? <MapControls controller={controller} /> : null}
        mapLabel="편집 중인 코스 경로 지도"
        panel={<CourseEditPanel state={state} detailHref={detailHref} />}
        panelLabel="코스 편집 입력"
        panelSize="expanded"
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
      />
      <CourseEditDialogs state={state} />
    </div>
  );
}
