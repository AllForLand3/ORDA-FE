import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, Dialog, TextArea, TextField } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import type { useCourseImportState } from '../hooks/useCourseImportState';

type State = ReturnType<typeof useCourseImportState>;

export function CourseImportPanel({ state }: { state: State }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const query = state.mountainsQuery;
  return (
    <form
      className="course-edit-form"
      id="course-import-form"
      ref={formRef}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        await state.save();
        window.requestAnimationFrame(() =>
          formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        );
      }}
    >
      <p className="course-edit-note">
        지도에서 꼭짓점을 드래그해 이동하고, 선을 클릭해 꼭짓점을 추가할 수 있습니다. Alt+클릭으로
        꼭짓점을 삭제합니다.
      </p>
      {state.geometryError ? <p role="alert">{state.geometryError}</p> : null}
      <div className="orda-field">
        <label className="orda-field__label" htmlFor="course-import-file">
          GeoJSON 파일
        </label>
        <input
          ref={fileRef}
          hidden
          id="course-import-file"
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          disabled={state.pending}
          onChange={(event) => {
            void state.selectFile(event.target.files?.[0]);
            // 같은 파일을 수정한 뒤 다시 선택할 수 있게 한다.
            event.target.value = '';
          }}
        />
        <Button
          disabled={state.pending}
          variant="secondary"
          onClick={() => fileRef.current?.click()}
        >
          파일 선택
        </Button>
        {state.fileName ? (
          <p className="course-import-filename">선택한 파일: {state.fileName}</p>
        ) : null}
        {state.reading ? <p role="status">파일을 읽는 중입니다.</p> : null}
        {state.fileError ? <p role="alert">{state.fileError}</p> : null}
        <p className="course-edit-note">
          EPSG:4326의 2D LineString을 가져옵니다. 경로가 하나인 Feature·FeatureCollection도
          지원합니다. GPX는 지원하지 않습니다.
        </p>
      </div>
      <div className="orda-field">
        <span className="orda-field__label">산 선택</span>
        {query.isPending ? <p role="status">산 목록을 불러오는 중입니다.</p> : null}
        {query.isError ? (
          <div role="alert">
            <p>산 목록을 불러오지 못했습니다.</p>
            <Button
              disabled={query.isFetching}
              onClick={() => {
                void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch());
              }}
              variant="secondary"
            >
              산 목록 다시 조회
            </Button>
          </div>
        ) : null}
        {!query.isPending && !query.isError && state.mountains.length === 0 ? (
          <p role="status">등록할 수 있는 산이 없습니다.</p>
        ) : null}
        <Select
          ariaLabel="코스가 속한 산"
          options={state.mountains.map((mountain) => ({
            value: mountain.mountainId,
            label: mountain.mountainName,
          }))}
          value={state.mountainId}
          onValueChange={state.setMountainId}
          disabled={state.pending || state.mountains.length === 0}
        />
        {!query.isPending && !query.isError ? (
          <Button
            disabled={query.isFetching || state.pending}
            variant="secondary"
            onClick={() => {
              void query.refetch();
            }}
          >
            산 목록 새로고침
          </Button>
        ) : null}
        {state.mountainError ? <p role="alert">{state.mountainError}</p> : null}
        {query.hasNextPage ? (
          <Button
            disabled={query.isFetching || state.pending}
            variant="secondary"
            onClick={() => {
              void query.fetchNextPage();
            }}
          >
            산 더 불러오기
          </Button>
        ) : null}
      </div>
      <TextField
        label="코스 이름"
        value={state.name}
        onChange={(event) => state.setName(event.target.value)}
        disabled={state.pending}
        required
        error={state.nameError}
        helperText="앞뒤 공백을 제외하고 최대 100자"
      />
      <TextArea
        label="메모"
        value={state.memo}
        onChange={(event) => state.setMemo(event.target.value)}
        disabled={state.pending}
        rows={3}
        error={state.memoError}
        helperText={`${[...state.memo].length} / 1000자`}
      />
      {state.failure ? <p role="alert">{state.failure}</p> : null}
      {state.pending ? <p role="status">코스를 등록하는 중입니다.</p> : null}
      <p className="course-edit-note">
        미리보기는 파일의 경로입니다. 서비스 영역 포함 여부는 등록할 때 서버에서 확인합니다.
      </p>
      <div className="course-edit-secondary-actions">
        <Link to={state.backHref}>취소</Link>
      </div>
    </form>
  );
}

export function CourseImportExitDialog({ state }: { state: State }) {
  return (
    <Dialog
      open={state.blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open) state.blocker.reset?.();
      }}
      title="가져오기를 나갈까요?"
      description={
        state.pending
          ? '등록 중입니다. 완료될 때까지 기다려주세요.'
          : '선택한 파일과 저장하지 않은 입력이 사라집니다.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => state.blocker.reset?.()}>
            계속 작성
          </Button>
          <Button
            variant="danger"
            disabled={state.pending}
            onClick={() => state.blocker.proceed?.()}
          >
            입력 버리고 나가기
          </Button>
        </>
      }
    >
      <p>입력을 유지하려면 계속 작성해주세요.</p>
    </Dialog>
  );
}
