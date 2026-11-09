import { getApiErrorCode, isNetworkError } from '@/lib/apiError';

import type { RouteSearchErrorCode } from '../types/route-search';

export interface RouteSearchErrorMessage {
  code: RouteSearchErrorCode | 'NETWORK_ERROR' | 'UNKNOWN';
  title: string;
  description: string;
  // 같은 요청을 다시 보내 결과가 달라질 수 있는 오류만 재시도를 안내한다.
  retryable: boolean;
}

// 화면 분기는 오류 응답의 `code` 기준이다. 서버 `message`로 분기하지 않는다.
export function getRouteSearchErrorMessage(error: unknown): RouteSearchErrorMessage {
  switch (getApiErrorCode(error)) {
    case 'ROUTE_NOT_FOUND':
      return {
        code: 'ROUTE_NOT_FOUND',
        title: '이동 가능한 경로를 찾지 못했어요',
        description:
          '두 지점 사이에 연결된 등산로가 없어요. 출발지나 도착지를 바꿔 다시 탐색해주세요.',
        retryable: false,
      };
    case 'ROUTE_NODE_NOT_FOUND':
      return {
        code: 'ROUTE_NODE_NOT_FOUND',
        title: '출발·도착 지점을 등산로에서 찾지 못했어요',
        description: '선택한 지점이 등산로 데이터에 없어요. 지점을 다시 선택해주세요.',
        retryable: false,
      };
    case 'ROUTE_SAME_POINT':
      return {
        code: 'ROUTE_SAME_POINT',
        title: '출발지와 도착지가 같아요',
        description: '서로 다른 지점을 출발지와 도착지로 선택해주세요.',
        retryable: false,
      };
    case 'MOUNTAIN_NOT_FOUND':
      return {
        code: 'MOUNTAIN_NOT_FOUND',
        title: '산 정보를 찾지 못했어요',
        description: '선택한 산을 다시 확인한 뒤 탐색해주세요.',
        retryable: false,
      };
    case 'UNAUTHORIZED':
      return {
        code: 'UNAUTHORIZED',
        title: '로그인이 필요해요',
        description: '경로 탐색은 로그인한 뒤 이용할 수 있어요.',
        retryable: false,
      };
    case 'INVALID_REQUEST':
      return {
        code: 'INVALID_REQUEST',
        title: '탐색 조건이 올바르지 않아요',
        description: '출발·도착 정보를 확인한 뒤 다시 탐색해주세요.',
        retryable: false,
      };
    default:
      return isNetworkError(error)
        ? {
            code: 'NETWORK_ERROR',
            title: '서버에 연결하지 못했어요',
            description: '네트워크 상태를 확인한 뒤 다시 시도해주세요.',
            retryable: true,
          }
        : {
            code: 'UNKNOWN',
            title: '경로를 탐색하지 못했어요',
            description: '잠시 후 다시 시도해주세요.',
            retryable: true,
          };
  }
}
