import { apiClient } from '@/lib/axios';

import type { CourseListItem } from '../types/courseList';

export async function getMyCourses(signal?: AbortSignal): Promise<CourseListItem[]> {
  const response = await apiClient.get<CourseListItem[]>('/courses', { signal });
  return response.data;
}
