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
): Promise<NearbySpotsResponse> {
  const response = await apiClient.get<NearbySpotsResponse>(
    `/courses/${encodeURIComponent(courseId)}/spots`,
    { params },
  );

  return response.data;
}

export async function getCourseFacilities(
  courseId: string,
  params: CourseNearbyParams = {},
): Promise<NearbyFacilitiesResponse> {
  const response = await apiClient.get<NearbyFacilitiesResponse>(
    `/courses/${encodeURIComponent(courseId)}/facilities`,
    { params },
  );

  return response.data;
}

export async function getFacility(facilityId: string): Promise<FacilityDetailResponse> {
  const response = await apiClient.get<FacilityDetailResponse>(
    `/facilities/${encodeURIComponent(facilityId)}`,
  );

  return response.data;
}
