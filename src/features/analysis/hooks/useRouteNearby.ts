import { useQueries } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useAccessToken } from '@/shared/hooks/useAccessToken';

import { getRouteNearby } from '../api/nearby';

import { DEFAULT_NEARBY_RADIUS_M, retryNearby, toNearbySummary } from './useCourseNearby';
import type { CourseNearbySummary } from './useCourseNearby';

/** 주변 정보를 조회할 경로 탐색 후보. id는 화면의 후보 식별자, edgeIds는 경로 탐색 응답 값이다. */
export interface RouteNearbyCandidate {
  id: string;
  edgeIds: readonly string[];
}

export const routeNearbyQueryKeys = {
  candidate: (
    userId: string | undefined,
    token: string | null,
    mountainId: string,
    radiusM: number,
    edgeIds: readonly string[],
  ) => ['analysis', 'route-nearby', userId, token, mountainId, radiusM, edgeIds.join(',')] as const,
};

/**
 * 경로 탐색 후보마다 주변 상세지점·시설(POST /routes/nearby)을 조회해 후보 ID별 결과로 돌려준다.
 * 카드의 계단·시설 수와 주변 시설 탭이 같은 결과를 함께 쓴다.
 */
export function useRouteNearby(
  mountainId: string | null | undefined,
  candidates: readonly RouteNearbyCandidate[],
  userId?: string,
): ReadonlyMap<string, UseQueryResult<CourseNearbySummary>> {
  const token = useAccessToken();
  const radiusM = DEFAULT_NEARBY_RADIUS_M;

  const results = useQueries({
    queries: candidates.map((candidate) => ({
      queryKey: routeNearbyQueryKeys.candidate(
        userId,
        token,
        mountainId ?? '',
        radiusM,
        candidate.edgeIds,
      ),
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        if (!mountainId) {
          throw new Error('조회할 산이 없습니다.');
        }
        const response = await getRouteNearby(
          { mountainId, edgeIds: [...candidate.edgeIds], radiusM },
          signal,
        );
        if (response.mountainId !== mountainId || response.radiusM !== radiusM) {
          throw new Error('후보 주변 정보의 응답 조건이 요청과 일치하지 않습니다.');
        }
        return toNearbySummary(response.radiusM, response.spots, response.facilities);
      },
      enabled: Boolean(userId && token && mountainId && candidate.edgeIds.length > 0),
      // 같은 후보(간선 목록)의 주변 정보는 바뀌지 않으므로 탭·후보를 오가도 다시 요청하지 않는다.
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: retryNearby,
    })),
  });

  return new Map(results.map((result, index) => [candidates[index].id, result]));
}
