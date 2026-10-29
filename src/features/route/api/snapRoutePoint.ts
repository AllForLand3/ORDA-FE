import { apiClient } from '@/lib/axios';

import type { RouteSnapRequest, RouteSnapResponse } from '../types/route-snap';

export async function snapRoutePoint(request: RouteSnapRequest, signal?: AbortSignal) {
  const { data } = await apiClient.get<RouteSnapResponse>('/routes/snap', {
    params: request,
    signal,
  });
  return data;
}
