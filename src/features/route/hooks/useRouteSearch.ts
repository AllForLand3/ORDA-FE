import { skipToken, useQuery } from '@tanstack/react-query';

import { searchRoutes } from '../api/searchRoutes';
import type { RouteSearchRequest } from '../types/route-search';

// 탐색 조건이 URL에 있으므로 결과는 URL에서 파생되는 서버 상태로 다룬다.
// useQuery를 쓰면 새로고침·뒤로가기에서 같은 조건의 결과가 복원되고, 같은 조건의 중복 요청이 합쳐진다.
// 탐색 실행(명시적 동작)은 조건을 URL에 기록하는 것이고, 조건이 없으면 요청하지 않는다(skipToken).
// 경로 없음·지점 없음 같은 4xx는 다시 보내도 결과가 같으므로 자동 재시도하지 않는다.
export function useRouteSearch(request: RouteSearchRequest | null) {
  return useQuery({
    queryKey: [
      'routes',
      'search',
      request?.mountainId ?? null,
      request?.startNodeId ?? null,
      request?.endNodeId ?? null,
    ],
    queryFn: request ? () => searchRoutes(request) : skipToken,
    retry: false,
    staleTime: Infinity,
  });
}
