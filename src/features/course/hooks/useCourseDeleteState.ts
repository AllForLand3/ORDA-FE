import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiErrorResponse } from '@/shared/types/api';
import { useAccessToken } from '@/shared/hooks/useAccessToken';
import { deleteCourse, getCourse } from '../api/course';
import type { CourseSnapshot } from '../types/course';
import { courseQueryKeys } from './useCourseQuery';
import { useCourseSessionGuard } from './useCourseSessionGuard';

export function useCourseDeleteState(backHref: string) {
  const accessToken = useAccessToken();
  const isCurrentSession = useCourseSessionGuard(accessToken);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { courseId = '' } = useParams();
  // 확인창을 연 시점의 이름·ETag를 고정한다. 재조회된 토큰을 자동으로 쓰지 않는다.
  const [target, setTarget] = useState<CourseSnapshot | null>(null);
  const [failure, setFailure] = useState('');
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const busy = useRef(false);
  const deletion = useMutation({
    mutationFn: ({ id, etag }: { id: string; etag: string }) => deleteCourse(id, etag),
    retry: false,
  });
  const refresh = useMutation({ mutationFn: () => getCourse(courseId), retry: false });
  const pending = deletion.isPending || refresh.isPending;

  async function confirm() {
    if (!isCurrentSession() || busy.current || !target?.etag || needsRefresh) return;
    busy.current = true;
    setFailure('');
    try {
      await deletion.mutateAsync({ id: target.course.courseId, etag: target.etag });
      if (!isCurrentSession()) return;
      await queryClient.cancelQueries({ queryKey: courseQueryKeys.detail(courseId, accessToken) });
      if (!isCurrentSession()) return;
      queryClient.removeQueries({ queryKey: courseQueryKeys.detail(courseId, accessToken) });
      queryClient.removeQueries({
        queryKey: courseQueryKeys.detail(target.course.courseId, accessToken),
      });
      navigate(backHref, { replace: true });
    } catch (error) {
      if (!isCurrentSession()) return;
      const code = axios.isAxiosError<ApiErrorResponse>(error)
        ? error.response?.data?.code
        : undefined;
      if (code === 'COURSE_EDIT_CONFLICT') {
        setNeedsRefresh(true);
        setFailure(
          '다른 곳에서 코스가 변경되어 삭제하지 않았습니다. 최신 내용을 확인한 뒤 다시 삭제해주세요.',
        );
      } else if (code === 'COURSE_NOT_FOUND') {
        setNeedsRefresh(true);
        setFailure('코스가 이미 삭제되었거나 접근할 수 없습니다. 상세 정보를 다시 확인해주세요.');
      } else if (code === 'COURSE_PRECONDITION_REQUIRED') {
        setNeedsRefresh(true);
        setFailure('삭제에 필요한 버전 정보를 확인할 수 없습니다. 상세 정보를 다시 조회해주세요.');
      } else {
        setFailure('삭제하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.');
      }
    } finally {
      busy.current = false;
    }
  }

  async function reload() {
    if (!isCurrentSession() || busy.current) return;
    busy.current = true;
    try {
      const latest = await refresh.mutateAsync();
      if (!isCurrentSession()) return;
      queryClient.setQueryData(courseQueryKeys.detail(courseId, accessToken), latest);
      setTarget(null);
      setNeedsRefresh(false);
      setFailure('');
    } catch {
      if (!isCurrentSession()) return;
      setFailure(
        '최신 코스를 불러오지 못했습니다. 삭제하지 않았습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      busy.current = false;
    }
  }

  return {
    target,
    failure,
    needsRefresh,
    pending,
    confirm,
    reload,
    open: (snapshot: CourseSnapshot) => {
      if (busy.current || !snapshot.etag) return;
      if (!needsRefresh) setFailure('');
      // 충돌 후 확인창을 닫았다가 열어도 재조회 없이 다시 삭제할 수 없다.
      setTarget(snapshot);
    },
    close: () => {
      if (!busy.current) setTarget(null);
    },
  };
}
