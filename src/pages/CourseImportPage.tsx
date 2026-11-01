import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import backIcon from '@/assets/course/course-back.svg';
import { MapPageLayout } from '@/components/layout';
import { Button } from '@/components/ui';
import {
  CourseImportPanel,
  CourseImportExitDialog,
  useCourseImportState,
  useEditableCourseLayer,
} from '@/features/course';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import type { CourseGeometry } from '@/features/course/types/course';
import './course-edit.css';

export function CourseImportPage() {
  const state = useCourseImportState();
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
          state.geometry ? (
            <ImportMap
              key={state.fileVersion}
              targetRef={targetRef}
              geometry={state.geometry}
              pending={state.pending}
              onChange={state.updateGeometry}
              onControllerChange={setController}
            />
          ) : (
            <p className="course-edit-map-note">
              GeoJSON 파일을 선택하면 경로를 미리 볼 수 있습니다.
            </p>
          )
        }
        mapControls={state.geometry ? <MapControls controller={controller} /> : null}
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

function ImportMap({
  geometry,
  pending,
  targetRef,
  onChange,
  onControllerChange,
}: {
  geometry: CourseGeometry;
  pending: boolean;
  targetRef: RefObject<HTMLDivElement | null>;
  onChange: ReturnType<typeof useCourseImportState>['updateGeometry'];
  onControllerChange: (controller: MapController | null) => void;
}) {
  const layer = useEditableCourseLayer(geometry);
  if (!layer) return null;
  return (
    <OpenLayersMap
      targetRef={targetRef}
      additionalLayers={layer.layers}
      editableLayer={layer.editableLayer}
      editingEnabled={!pending}
      onEditableGeometryChange={onChange}
      initialCenter={null}
      initialExtent={layer.extent}
      onControllerChange={onControllerChange}
    />
  );
}
