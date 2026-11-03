import axios from 'axios';
import { useParams, useSearchParams } from 'react-router-dom';

import type { ApiErrorResponse } from '@/shared/types/api';

import { useCourseQuery } from './useCourseQuery';

export function useCourseDetailState(editing = false) {
  const { courseId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const query = useCourseQuery(courseId, editing);
  const code = axios.isAxiosError<ApiErrorResponse>(query.error)
    ? query.error.response?.data?.code
    : undefined;
  const missing = !query.isValidId || code === 'COURSE_NOT_FOUND';
  const forbidden = code === 'FORBIDDEN';
  const listPageParam = params.get('listPage');
  const listPage =
    listPageParam && /^[1-9]\d*$/.test(listPageParam) && Number(listPageParam) <= 2147483647
      ? listPageParam
      : null;
  const tabParam = params.get('tab');
  const tab = tabParam === 'terrain' || tabParam === 'facilities' ? tabParam : 'overview';

  return {
    snapshot: query.data,
    isLoading: query.isValidId && query.isPending,
    isUnavailable: missing || query.isError,
    errorTitle: missing
      ? '코스를 찾을 수 없어요'
      : forbidden
        ? '코스에 접근할 수 없어요'
        : '코스 상세를 불러오지 못했어요',
    errorMessage: missing
      ? '코스가 없거나 접근할 수 없습니다.'
      : forbidden
        ? '이 코스를 조회할 권한이 없습니다.'
        : code === 'UNAUTHORIZED'
          ? '로그인이 필요합니다. 다시 로그인해주세요.'
          : code === 'COURSE_STATE_UNAVAILABLE'
            ? '코스 데이터 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.'
            : '연결 상태를 확인한 뒤 다시 시도해주세요.',
    canRetry: query.isValidId && !missing && !forbidden && code !== 'UNAUTHORIZED',
    retry: () => {
      void query.refetch();
    },
    tab,
    setTab: (value: string) => {
      if (value !== 'overview' && value !== 'terrain' && value !== 'facilities') return;
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', value);
        return next;
      });
    },
    backHref: listPage ? '/my-courses?page=' + listPage : '/my-courses',
    editHref: `/my-courses/${encodeURIComponent(courseId)}/edit?${new URLSearchParams(listPage ? { tab, listPage } : { tab })}`,
  };
}
