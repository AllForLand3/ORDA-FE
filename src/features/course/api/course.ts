import { apiClient } from '@/lib/axios';

import type { CourseDetailResponse } from '@/features/course/types/course';

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
