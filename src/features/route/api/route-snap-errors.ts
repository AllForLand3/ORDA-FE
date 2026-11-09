import { getApiErrorCode, isNetworkError } from '@/lib/apiError';

import type { RouteSnapErrorCode } from '../types/route-snap';

export interface RouteSnapErrorMessage {
  code: RouteSnapErrorCode | 'NETWORK_ERROR' | 'UNKNOWN';
  title: string;
  description: string;
  // 같은 좌표로 다시 요청해 결과가 달라질 수 있는 오류만 재시도를 안내한다.
  retryable: boolean;
}

// 화면 분기는 오류 응답의 `code` 기준이다. 서버 `message`로 분기하지 않는다.
export function getRouteSnapErrorMessage(error: unknown): RouteSnapErrorMessage {
  switch (getApiErrorCode(error)) {
    case 'ROUTE_SNAP_FAILED':
      return {
        code: 'ROUTE_SNAP_FAILED',
        title: '가까운 등산로를 찾지 못했어요',
        description:
          '선택한 위치 근처(300m 이내)에 등산로가 없어요. 등산로에 더 가까운 곳을 선택해주세요.',
        retryable: false,
      };
    case 'MOUNTAIN_NOT_FOUND':
      return {
        code: 'MOUNTAIN_NOT_FOUND',
        title: '산 정보를 찾지 못했어요',
        description: '선택한 산의 등산로 정보를 불러올 수 없어요.',
        retryable: false,
      };
    case 'UNAUTHORIZED':
      return {
        code: 'UNAUTHORIZED',
        title: '로그인이 필요해요',
        description: '등산로 지점 연결은 로그인한 뒤 이용할 수 있어요.',
        retryable: false,
      };
    case 'INVALID_REQUEST':
      return {
        code: 'INVALID_REQUEST',
        title: '위치 정보가 올바르지 않아요',
        description: '다른 위치를 다시 선택해주세요.',
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
            title: '등산로 지점을 확인하지 못했어요',
            description: '잠시 후 다시 시도해주세요.',
            retryable: true,
          };
  }
}
