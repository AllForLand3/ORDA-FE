import { Button, Dialog } from '@/components/ui';
import type { useCourseDeleteState } from '../hooks/useCourseDeleteState';

export function CourseDeleteDialog({ state }: { state: ReturnType<typeof useCourseDeleteState> }) {
  return (
    <Dialog
      open={state.target !== null}
      onOpenChange={(open) => {
        if (!open) state.close();
      }}
      title="코스를 삭제할까요?"
      description="삭제한 코스는 다시 조회하거나 편집할 수 없습니다."
      footer={
        <>
          <Button disabled={state.pending} variant="secondary" onClick={state.close}>
            취소
          </Button>
          {state.needsRefresh ? (
            <Button
              disabled={state.pending}
              onClick={() => {
                void state.reload();
              }}
            >
              최신 코스 확인
            </Button>
          ) : (
            <Button
              disabled={state.pending}
              variant="danger"
              onClick={() => {
                void state.confirm();
              }}
            >
              삭제하기
            </Button>
          )}
        </>
      }
    >
      <p className="course-delete-name">{state.target?.course.courseName}</p>
      {state.failure ? <p role="alert">{state.failure}</p> : null}
      {state.pending ? <p role="status">처리 중입니다.</p> : null}
    </Dialog>
  );
}
