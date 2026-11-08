import { apiClient } from '@/lib/axios';

import type {
  CourseDetail,
  CourseSnapshot,
  CreateCourseRequest,
  UpdateCourseRequest,
} from '../types/course';

function isStrongETag(value: unknown): value is string {
  // BE와 동일하게 단일 강한 태그만 허용한다. 따옴표도 토큰의 일부다.
  return typeof value === 'string' && /^"[\x21\x23-\x7E\x80-\xFF]*"$/.test(value);
}

function snapshot(course: CourseDetail, etag: unknown): CourseSnapshot {
  // POST/PATCH가 성공한 뒤 헤더 누락을 저장 실패로 바꾸지 않는다.
  return { course, etag: isStrongETag(etag) ? etag : null };
}

function requireETag(etag: string): string {
  if (!isStrongETag(etag)) {
    throw new Error('수정·삭제에 필요한 ETag가 없습니다. 코스를 다시 조회해주세요.');
  }
  return etag;
}

export async function createCourse(request: CreateCourseRequest): Promise<CourseSnapshot> {
  const response = await apiClient.post<CourseDetail>('/courses', request);
  return snapshot(response.data, response.headers.etag);
}

export async function getCourse(courseId: string, signal?: AbortSignal): Promise<CourseSnapshot> {
  const response = await apiClient.get<CourseDetail>(`/courses/${encodeURIComponent(courseId)}`, {
    signal,
  });
  return snapshot(response.data, response.headers.etag);
}

export async function updateCourse(
  courseId: string,
  request: UpdateCourseRequest,
  etag: string,
): Promise<CourseSnapshot> {
  const response = await apiClient.patch<CourseDetail>(
    `/courses/${encodeURIComponent(courseId)}`,
    request,
    { headers: { 'If-Match': requireETag(etag) } },
  );
  return snapshot(response.data, response.headers.etag);
}

export async function deleteCourse(courseId: string, etag: string): Promise<void> {
  await apiClient.delete(`/courses/${encodeURIComponent(courseId)}`, {
    headers: { 'If-Match': requireETag(etag) },
  });
}
