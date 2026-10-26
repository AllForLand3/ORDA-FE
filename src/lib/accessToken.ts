const ACCESS_TOKEN_KEY = 'orda.accessToken';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAccessToken(accessToken: string, rememberMe: boolean): void {
  clearAccessToken();

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}
