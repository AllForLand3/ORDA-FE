import { useQuery } from '@tanstack/react-query';

import { getCourse } from '../api/course';

export const courseQueryKeys = {
  detail: (courseId: string) => ['courses', 'detail', courseId] as const,
};

export function useCourseQuery(courseId: string, editing = false) {
  const isValidId =
    /^[0-9]+$/.test(courseId) && BigInt(courseId) > 0n && BigInt(courseId) <= 9223372036854775807n;
  const query = useQuery({
    queryKey: courseQueryKeys.detail(courseId),
    queryFn: ({ signal }) => getCourse(courseId, signal),
    enabled: isValidId,
    retry: false,
    staleTime: 0,
    // 소유자 전용 편집 데이터와 ETag를 화면 이탈 후 재사용하지 않는다.
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: !editing,
    refetchOnWindowFocus: false,
  });

  return { ...query, isValidId };
}
