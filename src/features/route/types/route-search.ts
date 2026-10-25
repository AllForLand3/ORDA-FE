import type { GeoJsonLineString } from '@/shared/types/geojson';

// POST /api/routes/search 계약 (Backend 초안). 식별자는 모두 문자열로 주고받는다.
export interface RouteSearchRequest {
  mountainId: string;
  startNodeId: string;
  endNodeId: string;
}

// 현재 계약 초안에 알려진 값은 DIST_FIRST뿐이다. 추가 값은 화면에서 코드 그대로 표시한다.
export type RoutePriorityCondition = string;

export interface RouteSearchCandidate {
  rank: number;
  priorityCondition: RoutePriorityCondition;
  lengthM: number;
  estTimeMin: number | null;
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
