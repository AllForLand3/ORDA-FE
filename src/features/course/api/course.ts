import { apiClient } from '@/lib/axios';

import type { CourseDetailResponse } from '@/features/course/types/course';

/** 인증된 사용자의 실제 코스 상세와 현재 버전을 조회한다. */
export async function getCourseDetail(
  courseId: string,
  signal?: AbortSignal,
): Promise<CourseDetailResponse> {
  const response = await apiClient.get<CourseDetailResponse>(
    `/courses/${encodeURIComponent(courseId)}`,
    { signal },
  );

  return response.data;
}
