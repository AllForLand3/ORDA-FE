import { skipToken, useQuery } from '@tanstack/react-query';

import { snapRoutePoint } from '../api/snapRoutePoint';
import type { RouteCoordinate } from '../mocks/route-setup';

// 좌표는 소수 6자리(약 0.1m)로 맞춰 요청과 캐시 키를 같게 한다.
function roundCoordinate(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

// 스냅은 같은 산·같은 좌표면 같은 노드를 돌려주는 조회라 useQuery로 다룬다.
// 확인 단계와 확정 후 표시, 새로고침 복원이 같은 캐시를 공유한다.
// 스냅 실패 같은 4xx는 다시 보내도 결과가 같으므로 자동 재시도하지 않고, 네트워크 오류는 화면에서 다시 시도한다.
export function useRouteSnap(mountainId: string, coordinate: RouteCoordinate | null) {
  const longitude = coordinate ? roundCoordinate(coordinate[0]) : null;
  const latitude = coordinate ? roundCoordinate(coordinate[1]) : null;

  return useQuery({
    queryKey: ['routes', 'snap', mountainId, longitude, latitude],
    queryFn:
      longitude !== null && latitude !== null
        ? ({ signal }) => snapRoutePoint({ mountainId, longitude, latitude }, signal)
        : skipToken,
    retry: false,
    staleTime: Infinity,
  });
}
