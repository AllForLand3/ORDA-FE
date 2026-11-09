import { isAxiosError } from 'axios';

// 오류 응답 본문에서 `code`만 꺼낸다. 화면 분기는 `message`가 아니라 `code` 기준으로 한다.
export function getApiErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null;

  const data: unknown = error.response?.data;
  if (typeof data !== 'object' || data === null || !('code' in data)) return null;

  return typeof data.code === 'string' ? data.code : null;
}

// 서버 응답 없이 실패한 요청(네트워크 단절, 프록시 대상 서버 미기동 등)을 구분한다.
export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response && error.code !== 'ERR_CANCELED';
}
