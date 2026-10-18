import { useRef } from 'react';
import { Link } from 'react-router-dom';

import { Button, Dialog, TextArea, TextField } from '@/components/ui';

import type { useCourseEditState } from '../hooks/useCourseEditState';

interface CourseEditPanelProps {
  state: ReturnType<typeof useCourseEditState>;
}

export function CourseEditPanel({ state }: CourseEditPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      className="course-edit-form"
      id="course-edit-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!state.apply()) formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
      }}
      ref={formRef}
    >
      <TextField
        endAdornment={
          <Button
            aria-label="코스 이름 지우기"
            onClick={() => state.setName('')}
            size="sm"
            variant="quiet"
          >
            <span aria-hidden="true">×</span>
          </Button>
        }
        error={state.nameError}
        label="코스 이름"
        maxLength={80}
        onChange={(event) => state.setName(event.target.value)}
        required
        value={state.draft.name}
      />
      <div className="course-edit-memo">
        <TextArea
          label="메모"
          maxLength={1000}
          onChange={(event) => state.setMemo(event.target.value)}
          rows={3}
          value={state.draft.memo}
        />
        <Button
          aria-label="메모 지우기"
          onClick={() => state.setMemo('')}
          size="sm"
          variant="quiet"
        >
          <span aria-hidden="true">×</span>
        </Button>
      </div>
      <section aria-labelledby="course-edit-tools-title" className="course-edit-tools">
        <h2 id="course-edit-tools-title">편집 도구</h2>
        <div>
          <p>경로 편집 도구 준비 중</p>
          <small>지점 이동·추가·삭제는 제공하지 않습니다.</small>
        </div>
      </section>
      <p className="course-edit-warning">경로를 수정하면 기존 분석 결과가 무효화됩니다.</p>
      <p className="course-edit-note">
        예시 입력을 편집하는 화면입니다. 저장은 현재 화면에만 적용되며, 실제 경로·분석 자료와 서버
        저장은 연결되지 않았습니다.
      </p>
      <p aria-live="polite" className="course-edit-status" role="status">
        {state.message ||
          (state.isDirty ? '적용하지 않은 변경이 있어요.' : '예시 입력 상태입니다.')}
      </p>
      <div className="course-edit-secondary-actions">
        <Link to={state.detailHref}>취소</Link>
        <Button
          disabled={!state.canReset}
          onClick={() => state.setResetOpen(true)}
          size="sm"
          variant="secondary"
        >
          초기화
        </Button>
      </div>
    </form>
  );
}

// 접힌 패널 안에 있으면 native dialog도 숨겨지므로 페이지에서 패널의 형제로 배치한다.
export function CourseEditDialogs({ state }: CourseEditPanelProps) {
  return (
    <>
      <Dialog
        description="처음 표시한 예시 코스 이름과 메모로 되돌립니다. 서버 자료는 변경하지 않습니다."
        footer={
          <>
            <Button onClick={() => state.setResetOpen(false)} variant="secondary">
              계속 편집
            </Button>
            <Button onClick={state.reset}>초기화</Button>
          </>
        }
        onOpenChange={state.setResetOpen}
        open={state.resetOpen}
        title="입력을 초기화할까요?"
      >
        <p>현재 입력은 지워집니다.</p>
      </Dialog>
      <Dialog
        description="적용하지 않은 변경이 사라집니다. 서버에 저장된 내용은 없습니다."
        footer={
          <>
            <Button onClick={() => state.blocker.reset?.()} variant="secondary">
              계속 편집
            </Button>
            <Button onClick={() => state.blocker.proceed?.()} variant="danger">
              변경 버리고 나가기
            </Button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) state.blocker.reset?.();
        }}
        open={state.blocker.state === 'blocked'}
        title="편집을 나갈까요?"
      >
        <p>입력한 내용을 유지하려면 계속 편집해주세요.</p>
      </Dialog>
    </>
  );
}
