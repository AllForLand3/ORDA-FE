export function getSafeRedirectPath(requestedPath: string | null): string {
  return requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/mountains';
}
