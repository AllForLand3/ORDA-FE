import type { GeoJsonPosition } from '@/shared/types/geojson';

// GET /api/routes/snap 계약 (Backend 초안). 좌표는 EPSG:4326 경도·위도다.
export interface RouteSnapRequest {
  mountainId: string;
  longitude: number;
  latitude: number;
}

// 사용자가 지정한 좌표(요청)와 서버가 고른 등산로 노드(응답)는 서로 다른 개념이다.
export interface RouteSnapResponse {
  mountainId: string;
  nodeId: string;
  // 요청 좌표에서 노드까지의 거리(m). 서버 산정 값을 그대로 쓴다.
  distanceM: number;
  // 스냅된 노드 위치. EPSG:4326, [경도, 위도] 순서.
  coordinates: GeoJsonPosition;
}

export type RouteSnapErrorCode =
  'INVALID_REQUEST' | 'MOUNTAIN_NOT_FOUND' | 'ROUTE_SNAP_FAILED' | 'UNAUTHORIZED';
