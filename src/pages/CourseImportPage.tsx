import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import backIcon from '@/assets/course/course-back.svg';
import { MapPageLayout } from '@/components/layout';
import { Button } from '@/components/ui';
import {
  CourseImportPanel,
  CourseImportExitDialog,
  useCourseImportState,
  useCourseLayer,
} from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import './course-edit.css';

export function CourseImportPage() {
  const state = useCourseImportState();
  const layer = useCourseLayer(state.geometry);
  const targetRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<MapController | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  return (
    <div className="course-edit-page course-import-page">
      <MapPageLayout
        header={
          <div className="course-edit-header">
            <Link to={state.backHref}>
              <img src={backIcon} alt="" aria-hidden="true" />
              <h1>코스 가져오기</h1>
            </Link>
            <Button
              type="submit"
              form="course-import-form"
              disabled={!state.canSave}
              onClick={() => setPanelOpen(true)}
            >
              등록
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
            <p className="course-edit-map-note">
              GeoJSON 파일을 선택하면 경로를 미리 볼 수 있습니다.
            </p>
          )
        }
        mapControls={layer ? <MapControls controller={controller} /> : null}
        mapLabel="가져온 코스 미리보기 지도"
        panel={<CourseImportPanel state={state} />}
        panelLabel="코스 가져오기 입력"
        panelSize="expanded"
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
      />
      <CourseImportExitDialog state={state} />
    </div>
  );
}
