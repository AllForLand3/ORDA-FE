import { apiClient } from '@/lib/axios';

import type {
  CourseNearbyParams,
  FacilityDetailResponse,
  NearbyFacilitiesResponse,
  NearbySpotsResponse,
  RouteNearbyRequest,
  RouteNearbyResponse,
} from '../types/nearby';

export async function getCourseSpots(
  courseId: string,
  params: CourseNearbyParams = {},
  signal?: AbortSignal,
): Promise<NearbySpotsResponse> {
  const response = await apiClient.get<NearbySpotsResponse>(
    `/courses/${encodeURIComponent(courseId)}/spots`,
    { params, signal },
  );

  return response.data;
}

export async function getCourseFacilities(
  courseId: string,
  params: CourseNearbyParams = {},
  signal?: AbortSignal,
): Promise<NearbyFacilitiesResponse> {
  const response = await apiClient.get<NearbyFacilitiesResponse>(
    `/courses/${encodeURIComponent(courseId)}/facilities`,
    { params, signal },
  );

  return response.data;
}

/** 경로 탐색 후보의 간선 기준으로 주변 상세지점·시설을 조회한다(POST /routes/nearby). */
export async function getRouteNearby(
  request: RouteNearbyRequest,
  signal?: AbortSignal,
): Promise<RouteNearbyResponse> {
  const response = await apiClient.post<RouteNearbyResponse>('/routes/nearby', request, {
    signal,
  });

  return response.data;
}

export async function getFacility(
  facilityId: string,
  signal?: AbortSignal,
): Promise<FacilityDetailResponse> {
  const response = await apiClient.get<FacilityDetailResponse>(
    `/facilities/${encodeURIComponent(facilityId)}`,
    { signal },
  );

  return response.data;
}
