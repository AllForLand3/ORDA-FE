import type { GeoJsonLineString } from '@/shared/types/geojson';

// POST /api/routes/search 계약 (Backend 초안). 식별자는 모두 문자열로 주고받는다.
export interface RouteSearchRequest {
  mountainId: string;
  startNodeId: string;
  endNodeId: string;
  // 없으면 서버가 거리 우선(DIST_FIRST)만 탐색한다.
  priorityConditions?: RouteSearchPriorityCondition[];
}

// 요청에 보낼 수 있는 탐색 기준. 완만한 경사(GENTLE_SLOPE)는 구간 고도 값이 들어온 뒤 추가한다.
export type RouteSearchPriorityCondition = 'DIST_FIRST' | 'LESS_STAIR';

// 응답 값. 알려진 값은 DIST_FIRST, LESS_STAIR이고, 그 밖의 값은 화면에서 코드 그대로 표시한다.
export type RoutePriorityCondition = string;

export interface RouteSearchCandidate {
  rank: number;
  priorityCondition: RoutePriorityCondition;
  lengthM: number;
  estTimeMin: number | null;
  // 경로가 지나는 구간의 계단 지점 수 합계. 주변 반경 조회의 계단 수와 다르다.
  stairCount: number;
  edgeIds: string[];
  // EPSG:4326, [경도, 위도] 순서. 서버가 준 좌표 순서와 방향을 그대로 쓴다.
  geometry: GeoJsonLineString;
}

export interface RouteSearchResponse {
  mountainId: string;
  startNodeId: string;
  endNodeId: string;
  candidates: RouteSearchCandidate[];
}

export type RouteSearchErrorCode =
  | 'INVALID_REQUEST'
  | 'MOUNTAIN_NOT_FOUND'
  | 'ROUTE_NODE_NOT_FOUND'
  | 'ROUTE_SAME_POINT'
  | 'ROUTE_NOT_FOUND'
  | 'UNAUTHORIZED';
