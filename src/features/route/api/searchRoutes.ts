import { apiClient } from '@/lib/axios';

import type { RouteSearchRequest, RouteSearchResponse } from '../types/route-search';

export async function searchRoutes(request: RouteSearchRequest) {
  const { data } = await apiClient.post<RouteSearchResponse>('/routes/search', request);
  return data;
}
