import { useQuery } from '@tanstack/react-query';

import { getCourseDetail } from '../api/course';

export function isValidCourseId(courseId: string | undefined): courseId is string {
  return courseId !== undefined && /^[1-9]\d*$/.test(courseId);
}

export const courseQueryKeys = {
  detail: (userId: string | undefined, courseId: string | undefined) =>
    ['courses', 'detail', userId, courseId] as const,
};

export function useCourseDetailQuery(courseId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: courseQueryKeys.detail(userId, courseId),

    queryFn: ({ signal }) => {
      if (!userId || !isValidCourseId(courseId)) {
        throw new Error('코스 상세 조회에 필요한 정보가 없습니다.');
      }

      return getCourseDetail(courseId, signal);
    },

    enabled: Boolean(userId) && isValidCourseId(courseId),

    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}
