import { apiClient } from '@/lib/axios';

import type { CourseListPage } from '../types/courseList';

export async function getMyCourses(page: number, signal?: AbortSignal): Promise<CourseListPage> {
  const response = await apiClient.get<CourseListPage>('/courses', { params: { page }, signal });
  return response.data;
}
