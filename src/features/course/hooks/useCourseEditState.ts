import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useBeforeUnload, useBlocker, useParams } from 'react-router-dom';

import { getAccessToken } from '@/lib/accessToken';
import type { ApiErrorResponse } from '@/shared/types/api';
import { useAccessToken } from '@/shared/hooks/useAccessToken';

import { getCourse, updateCourse } from '../api/course';
import type { CourseSnapshot, UpdateCourseRequest } from '../types/course';
import { courseQueryKeys } from './useCourseQuery';
import { useCourseSessionGuard } from './useCourseSessionGuard';

function errorCode(error: unknown) {
  return axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data?.code : undefined;
}

export function useCourseEditState(initial: CourseSnapshot) {
  const accessToken = useAccessToken();
  const isCurrentSession = useCourseSessionGuard(accessToken);
  const queryClient = useQueryClient();
  const { courseId = initial.course.courseId } = useParams();
  // 편집 시작 시점의 원본과 ETag를 고정한다. 백그라운드 조회로 바꾸지 않는다.
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState({
    name: initial.course.courseName,
    memo: initial.course.memo ?? '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const busy = useRef(false);
  const saveMutation = useMutation({
    mutationFn: ({ request, etag }: { request: UpdateCourseRequest; etag: string }) =>
      updateCourse(baseline.course.courseId, request, etag),
    retry: false,
  });
  const reloadMutation = useMutation({
    mutationFn: () => getCourse(baseline.course.courseId),
    retry: false,
  });
  const pending = saveMutation.isPending || reloadMutation.isPending;
  const isDirty =
    draft.name !== baseline.course.courseName || draft.memo !== (baseline.course.memo ?? '');
  const nameError = !draft.name.trim()
    ? '코스 이름을 입력해주세요.'
    : [...draft.name.trim()].length > 100
      ? '코스 이름은 100자 이내로 입력해주세요.'
      : undefined;
  const memoError =
    [...draft.memo].length > 1000 ? '메모는 1000자 이내로 입력해주세요.' : undefined;
  // 인증 만료로 이동하는 로그인 경로는 편집 이탈 확인으로 막지 않는다.
  const blocker = useBlocker(() => getAccessToken() !== null && (isDirty || busy.current));
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!isDirty && !busy.current) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [isDirty],
    ),
  );

  function adopt(snapshot: CourseSnapshot) {
    // Query의 구조 공유 결과를 사용해 경로가 같으면 기존 geometry·지도 참조를 유지한다.
    const next =
      queryClient.setQueryData<CourseSnapshot>(
        courseQueryKeys.detail(courseId, accessToken),
        snapshot,
      ) ?? snapshot;
    setBaseline(next);
    setDraft({ name: next.course.courseName, memo: next.course.memo ?? '' });
    setSubmitted(false);
    setNeedsReload(false);
    setFailure('');
  }

  async function save() {
    if (!isCurrentSession()) return;
    setSubmitted(true);
    if (busy.current || nameError || memoError || !isDirty || needsReload || !baseline.etag) return;
    busy.current = true;
    setFailure('');
    setMessage('');
    const request: UpdateCourseRequest = {};
    if (draft.name.trim() !== baseline.course.courseName) request.courseName = draft.name.trim();
    if (draft.memo !== (baseline.course.memo ?? '')) request.memo = draft.memo || null;
    // 빈 PATCH는 보내지 않는다. 이름 앞뒤 공백만 바뀐 경우 로컬 입력만 정리한다.
    if (Object.keys(request).length === 0) {
      setDraft((current) => ({ ...current, name: baseline.course.courseName }));
      busy.current = false;
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({ request, etag: baseline.etag });
      if (!isCurrentSession()) return;
      adopt(saved);
      setMessage('코스를 저장했습니다.');
    } catch (error) {
      if (!isCurrentSession()) return;
      const code = errorCode(error);
      if (code === 'COURSE_EDIT_CONFLICT') {
        setNeedsReload(true);
        setFailure(
          '다른 곳에서 코스가 변경되었습니다. 입력은 유지했습니다. 최신 내용을 확인한 뒤 다시 편집해주세요.',
        );
      } else if (code === 'COURSE_NOT_FOUND') {
        setNeedsReload(true);
        setFailure('코스가 삭제되었거나 접근할 수 없습니다. 입력은 유지했습니다.');
      } else if (code === 'COURSE_PRECONDITION_REQUIRED') {
        setNeedsReload(true);
        setFailure(
          '코스 버전을 확인할 수 없습니다. 입력은 유지했습니다. 최신 내용을 다시 불러와주세요.',
        );
      } else {
        setFailure(
          '저장하지 못했습니다. 입력은 유지했습니다. 연결 상태와 입력을 확인한 뒤 다시 시도해주세요.',
        );
      }
    } finally {
      busy.current = false;
    }
  }

  async function reload() {
    if (!isCurrentSession() || busy.current) return;
    busy.current = true;
    setReloadOpen(false);
    try {
      const latest = await reloadMutation.mutateAsync();
      if (!isCurrentSession()) return;
      adopt(latest);
      setMessage('최신 코스를 불러왔습니다.');
    } catch {
      if (!isCurrentSession()) return;
      setFailure('최신 코스를 불러오지 못했습니다. 기존 입력은 유지했습니다.');
    } finally {
      busy.current = false;
    }
  }

  return {
    course: baseline.course,
    draft,
    pending,
    isDirty,
    blocker,
    nameError: submitted ? nameError : undefined,
    memoError: submitted ? memoError : undefined,
    canSave: isDirty && !pending && !needsReload && baseline.etag !== null,
    needsReload: needsReload || baseline.etag === null,
    message,
    failure,
    reloadOpen,
    setReloadOpen,
    resetOpen,
    setResetOpen,
    setName: (name: string) => {
      setDraft((current) => ({ ...current, name }));
      setMessage('');
    },
    setMemo: (memo: string) => {
      setDraft((current) => ({ ...current, memo }));
      setMessage('');
    },
    save,
    reload,
    reset: () => {
      setDraft({ name: baseline.course.courseName, memo: baseline.course.memo ?? '' });
      setSubmitted(false);
      setResetOpen(false);
      setFailure('');
      setMessage('저장된 이름과 메모로 되돌렸습니다.');
    },
  };
}
