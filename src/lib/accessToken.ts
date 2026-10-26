const ACCESS_TOKEN_KEY = 'orda.accessToken';
const accessTokenListeners = new Set<() => void>();

function notifyAccessTokenListeners(): void {
  accessTokenListeners.forEach((listener) => listener());
}

function removeStoredAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAccessToken(accessToken: string, rememberMe: boolean): void {
  removeStoredAccessToken();

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  notifyAccessTokenListeners();
}

export function clearAccessToken(): void {
  removeStoredAccessToken();
  notifyAccessTokenListeners();
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
