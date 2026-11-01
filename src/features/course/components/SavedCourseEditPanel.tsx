import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, Dialog, TextArea, TextField } from '@/components/ui';
import type { useSavedCourseEditState } from '../hooks/useSavedCourseEditState';

type State = ReturnType<typeof useSavedCourseEditState>;

export function SavedCourseEditPanel({ state, detailHref }: { state: State; detailHref: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      className="course-edit-form"
      id="saved-course-edit-form"
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
      <TextField
        label="코스 이름"
        required
        value={state.draft.name}
        disabled={state.pending}
        error={state.nameError}
        helperText="앞뒤 공백을 제외하고 최대 100자"
        onChange={(event) => state.setName(event.target.value)}
      />
      <TextArea
        label="메모"
        rows={3}
        value={state.draft.memo}
        disabled={state.pending}
        error={state.memoError}
        helperText={`${[...state.draft.memo].length} / 1000자`}
        onChange={(event) => state.setMemo(event.target.value)}
      />
      <p className="course-edit-note">
        지도에서 꼭짓점을 드래그해 이동하고, 선을 클릭해 꼭짓점을 추가할 수 있습니다. Alt+클릭으로
        꼭짓점을 삭제합니다.
      </p>
      {state.geometryError ? <p role="alert">{state.geometryError}</p> : null}
      <p className="course-edit-note">
        이름, 메모, 지도 경로를 수정할 수 있습니다. 변경 사항은 저장 버튼으로 반영합니다.
      </p>
      {state.failure ? <p role="alert">{state.failure}</p> : null}
      <p role="status" className="course-edit-status">
        {state.pending
          ? '처리 중입니다. 완료될 때까지 경로 편집이 잠깁니다.'
          : state.message ||
            (state.isDirty ? '저장하지 않은 변경이 있습니다.' : '저장된 내용입니다.')}
      </p>
      {state.needsReload ? (
        <div>
          <p>계속 저장하려면 최신 코스를 불러와야 합니다.</p>
          <Button
            disabled={state.pending}
            onClick={() => state.setReloadOpen(true)}
            variant="secondary"
          >
            최신 코스 불러오기
          </Button>
        </div>
      ) : null}
      <div className="course-edit-secondary-actions">
        <Link to={detailHref}>취소</Link>
        <Button
          disabled={!state.isDirty || state.pending}
          onClick={() => state.setResetOpen(true)}
          variant="secondary"
        >
          초기화
        </Button>
      </div>
    </form>
  );
}

export function SavedCourseEditDialogs({ state }: { state: State }) {
  return (
    <>
      <Dialog
        open={state.resetOpen}
        onOpenChange={state.setResetOpen}
        title="입력을 초기화할까요?"
        description="편집을 시작했거나 마지막으로 저장한 이름, 메모, 경로로 되돌립니다."
        footer={
          <>
            <Button variant="secondary" onClick={() => state.setResetOpen(false)}>
              계속 편집
            </Button>
            <Button onClick={state.reset}>초기화</Button>
          </>
        }
      >
        <p>저장하지 않은 입력은 사라집니다.</p>
      </Dialog>
      <Dialog
        open={state.reloadOpen}
        onOpenChange={state.setReloadOpen}
        title="최신 코스를 불러올까요?"
        description="현재 입력과 경로 변경을 버리고 서버의 최신 이름, 메모, 경로로 다시 시작합니다."
        footer={
          <>
            <Button variant="secondary" onClick={() => state.setReloadOpen(false)}>
              계속 편집
            </Button>
            <Button
              onClick={() => {
                void state.reload();
              }}
              variant="danger"
            >
              입력 버리고 불러오기
            </Button>
          </>
        }
      >
        <p>현재 입력을 서버에 덮어쓰지 않습니다.</p>
      </Dialog>
      <Dialog
        open={state.blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) state.blocker.reset?.();
        }}
        title="편집을 나갈까요?"
        description={
          state.pending
            ? '저장 처리 중입니다. 완료된 뒤 이동해주세요.'
            : '저장하지 않은 변경이 사라집니다.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => state.blocker.reset?.()}>
              계속 편집
            </Button>
            <Button
              disabled={state.pending}
              variant="danger"
              onClick={() => state.blocker.proceed?.()}
            >
              변경 버리고 나가기
            </Button>
          </>
        }
      >
        <p>입력을 유지하려면 계속 편집해주세요.</p>
      </Dialog>
    </>
  );
}
