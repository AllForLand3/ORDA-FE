import { useCallback, useState } from 'react';
import { useBeforeUnload, useBlocker, useSearchParams } from 'react-router-dom';

import { MOCK_MY_COURSES } from '../mocks/my-courses';

// UI 전용 초기 메모. 서버 원본이나 실제 저장된 사용자 입력이 아니다.
const EXAMPLE_MEMO = '주말 아침을 위한 산책 코스';

export function useCourseEditState(courseId: string | undefined) {
  const [params] = useSearchParams();
  const course = MOCK_MY_COURSES.find((item) => item.id === courseId);
  const initial = { name: course?.name ?? '', memo: EXAMPLE_MEMO };
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const isDirty = Boolean(course) && (draft.name !== applied.name || draft.memo !== applied.memo);
  const canReset = draft.name !== initial.name || draft.memo !== initial.memo;
  const nameError = !draft.name.trim() ? '코스 이름을 입력해주세요.' : undefined;
  const blocker = useBlocker(isDirty);
  const detailParams = new URLSearchParams(params);
  detailParams.delete('export');
  const detailHref = `/my-courses/${encodeURIComponent(courseId ?? '')}${detailParams.size ? `?${detailParams}` : ''}`;

  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!isDirty) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [isDirty],
    ),
  );

  return {
    course,
    draft,
    detailHref,
    blocker,
    isDirty,
    canReset,
    resetOpen,
    setResetOpen,
    nameError: submitted ? nameError : undefined,
    message,
    setName: (name: string) => {
      setDraft((current) => ({ ...current, name }));
      setMessage('');
    },
    setMemo: (memo: string) => {
      setDraft((current) => ({ ...current, memo }));
      setMessage('');
    },
    apply: () => {
      setSubmitted(true);
      if (nameError) return false;
      // 현재 마운트된 편집 화면에서만 적용한다. Mock 목록·서버·브라우저 저장소는 바꾸지 않는다.
      const next = { ...draft, name: draft.name.trim() };
      setDraft(next);
      setApplied(next);
      setMessage(
        '현재 편집 화면의 예시에만 반영했어요. 서버에는 저장되지 않으며 화면을 나가면 사라집니다.',
      );
      return true;
    },
    reset: () => {
      setDraft(initial);
      setSubmitted(false);
      setMessage('처음 표시한 예시 입력으로 초기화했어요.');
      setResetOpen(false);
    },
  };
}
