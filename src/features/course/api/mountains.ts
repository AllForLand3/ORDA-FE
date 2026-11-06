import { apiClient } from '@/lib/axios';
import { isValidMountainId } from '../utils/mountainId';

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

function getMountainPath(mountainId: string) {
  if (!isValidMountainId(mountainId)) {
    throw new TypeError('유효한 산 ID가 필요합니다.');
  }

  return `/mountains/${encodeURIComponent(mountainId)}`;
}

export async function getMountain(mountainId: string): Promise<MountainDetail> {
  const response = await apiClient.get<MountainDetail>(getMountainPath(mountainId));

  return response.data;
}

export async function getServiceArea(mountainId: string): Promise<ServiceAreaFeatureCollection> {
  const response = await apiClient.get<ServiceAreaFeatureCollection>(
    `${getMountainPath(mountainId)}/service-area`,
  );

  return response.data;
}
