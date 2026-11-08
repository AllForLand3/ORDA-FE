import { apiClient } from '@/lib/axios';

import type {
  CourseNearbyParams,
  FacilityDetailResponse,
  NearbyFacilitiesResponse,
  NearbySpotsResponse,
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
