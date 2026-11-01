const ACCESS_TOKEN_KEY = 'orda.accessToken';
const accessTokenListeners = new Set<() => void>();

function notifyAccessTokenListeners(): void {
  accessTokenListeners.forEach((listener) => listener());
}

function removeStoredAccessToken(): void {
  let firstError: unknown;

  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.warn('localStorage 토큰 삭제 실패:', error);
    firstError = error;
  }

  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.warn('sessionStorage 토큰 삭제 실패:', error);
    if (!firstError) {
      firstError = error;
    }
  }

  if (firstError) {
    throw firstError;
  }
}

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.warn('토큰 조회 실패:', error);
    return null;
  }
}

export function storeAccessToken(accessToken: string, rememberMe: boolean): void {
  try {
    removeStoredAccessToken();

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    notifyAccessTokenListeners();
  } catch (error) {
    console.warn('엑세스 토큰 저장 실패:', error);
    throw new Error('로그인 정보를 저장할 수 없습니다.');
  }
}

export function clearAccessToken(): void {
  try {
    removeStoredAccessToken();
  } catch (error) {
    console.warn('엑세스 토큰 삭제 중 오류가 발생했습니다.', error);
  } finally {
    notifyAccessTokenListeners();
  }
}

export function subscribeToAccessToken(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACCESS_TOKEN_KEY) {
      listener();
    }
  };

  accessTokenListeners.add(listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    accessTokenListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}
