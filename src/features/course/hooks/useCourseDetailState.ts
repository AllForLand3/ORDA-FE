import { isAxiosError } from 'axios';
import { useParams, useSearchParams } from 'react-router-dom';

import type { ApiErrorResponse } from '@/shared/types/api';

import { MOCK_MY_COURSES } from '../mocks/my-courses';
import type { MockMyCourse } from '../mocks/my-courses';
import type { CourseDetailResponse } from '../types/course';

import { useCourseQuery } from './useCourseQuery';

type CourseDetailTab = 'overview' | 'terrain' | 'facilities';

interface CourseDetailError {
  title: string;
  message: string;
  canRetry: boolean;
}

function toCourseDetailResponse(course: MockMyCourse): CourseDetailResponse {
  return {
    courseId: course.id,
    mountainId: course.mountainName,
    courseName: course.name,
    memo: course.description,
    createType: course.category === 'imported' ? 'IMPORT' : 'SAVE',
    revNo: 0,
    geometry: { type: 'LineString', coordinates: [] },
    lengthM: course.distanceM,
  };
}

/** 상세 조회 오류를 사용자 안내와 수동 재시도 가능 여부로 변환한다. */
function getCourseDetailError(error: unknown): CourseDetailError {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const code = error.response?.data?.code;

    switch (code) {
      case 'INVALID_REQUEST':
        return {
          title: '코스 주소를 확인해주세요',
          message: '올바른 코스 주소로 다시 접속해주세요.',
          canRetry: false,
        };

      case 'COURSE_NOT_FOUND':
      case 'RESOURCE_NOT_FOUND':
        return {
          title: '코스를 찾을 수 없어요',
          message: '삭제되었거나 접근할 수 없는 코스입니다.',
          canRetry: false,
        };

      case 'FORBIDDEN':
        return {
          title: '코스에 접근할 수 없어요',
          message: '접근 권한이나 접속 환경을 확인해주세요.',
          canRetry: false,
        };

      case 'UNAUTHORIZED':
        return {
          title: '로그인이 필요해요',
          message: '다시 로그인한 뒤 이용해주세요.',
          canRetry: false,
        };

      case 'COURSE_STATE_UNAVAILABLE':
        return {
          title: '코스 정보를 확인할 수 없어요',
          message: '코스 정보에 문제가 있어요. 잠시 후 다시 시도해주세요.',
          canRetry: true,
        };
    }

    if (!error.response) {
      return {
        title: '코스 정보를 불러오지 못했어요',
        message: '연결 상태를 확인한 뒤 다시 시도해주세요.',
        canRetry: true,
      };
    }
  }

  return {
    title: '코스 정보를 불러오지 못했어요',
    message: '잠시 후 다시 시도해주세요.',
    canRetry: true,
  };
}

/** 실제 상세 조회와 URL의 탭·목록 복귀 조건을 조합해 페이지 상태를 제공한다. */
export function useCourseDetailState(editing = false) {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const query = useCourseQuery(courseId ?? '', editing);
  const mockCourse = MOCK_MY_COURSES.find((item) => item.id === courseId);
  const mockDetail = mockCourse ? toCourseDetailResponse(mockCourse) : undefined;
  const isMockPreviewError = Boolean(mockDetail) && params.get('preview') === 'error';

  const tabParam = params.get('tab');
  const tab: CourseDetailTab =
    tabParam === 'terrain' || tabParam === 'facilities' ? tabParam : 'overview';

  const listParams = new URLSearchParams(params.get('list') ?? '');
  const listPage = params.get('listPage');
  if (!listParams.size && listPage && /^[1-9]\d*$/.test(listPage) && Number(listPage) <= 2147483647)
    listParams.set('page', listPage);
  const backHref = `/my-courses${listParams.size ? `?${listParams}` : ''}`;
  const editParams = new URLSearchParams({ tab });
  if (params.has('list')) editParams.set('list', params.get('list') ?? '');
  if (listPage && /^[1-9]\d*$/.test(listPage) && Number(listPage) <= 2147483647)
    editParams.set('listPage', listPage);
  const editHref = `/my-courses/${encodeURIComponent(courseId ?? '')}/edit?${editParams}`;

  const invalidId = !mockDetail && !query.isValidId;

  const error: CourseDetailError | null = isMockPreviewError
    ? {
        title: '코스 상세를 표시하지 못했어요',
        message: '오류 UI 데모입니다. 실제 서버 요청이 실패한 상태는 아닙니다.',
        canRetry: true,
      }
    : invalidId
      ? {
          title: courseId ? '코스를 찾을 수 없어요' : '코스 주소를 확인해주세요',
          message: courseId
            ? '삭제되었거나 접근할 수 없는 코스입니다.'
            : '올바른 코스 주소로 다시 접속해주세요.',
          canRetry: false,
        }
      : query.isError
        ? getCourseDetailError(query.error)
        : null;

  return {
    course: error ? undefined : (mockDetail ?? query.data?.course),
    snapshot: mockDetail ? undefined : query.data,
    isUnavailable: Boolean(error),
    errorTitle: error?.title ?? '',
    errorMessage: error?.message ?? '',
    canRetry: error?.canRetry ?? false,
    mockCourse,
    isMock: Boolean(mockDetail),
    isMockPreviewError,
    tab,
    backHref,
    editHref,
    error,
    isExportOpen: Boolean(mockDetail) && params.get('export') === '1',

    isLoading: !mockDetail && !invalidId && query.isPending,
    isFetching: query.isFetching,

    retry: () => {
      if (isMockPreviewError) {
        setParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.delete('preview');
            return next;
          },
          { replace: true },
        );
        return;
      }

      void query.refetch();
    },

    setExportOpen: (open: boolean) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (open) next.set('export', '1');
          else next.delete('export');
          return next;
        },
        { replace: true },
      );
    },

    setTab: (value: string) => {
      if (value !== 'overview' && value !== 'terrain' && value !== 'facilities') {
        return;
      }

      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', value);
        return next;
      });
    },
  };
}
