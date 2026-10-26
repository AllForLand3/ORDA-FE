import { apiClient } from '@/lib/axios';

import type {
  MountainDetail,
  MountainListItem,
  MountainSearchParams,
  PageResponse,
  ServiceAreaFeatureCollection,
} from '../types/mountain';

export async function getMountains(
  params: MountainSearchParams = {},
): Promise<PageResponse<MountainListItem>> {
  const response = await apiClient.get<PageResponse<MountainListItem>>('/mountains', { params });

  return response.data;
}

export async function getMountain(mountainId: string): Promise<MountainDetail> {
  const response = await apiClient.get<MountainDetail>(`/mountains/${mountainId}`);

  return response.data;
}

export async function getServiceArea(mountainId: string): Promise<ServiceAreaFeatureCollection> {
  const response = await apiClient.get<ServiceAreaFeatureCollection>(
    `/mountains/${mountainId}/service-area`,
  );

  return response.data;
}
