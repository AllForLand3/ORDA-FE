import { useSyncExternalStore } from 'react';

import { getAccessToken, subscribeToAccessToken } from '@/lib/accessToken';

export function useAccessToken() {
  return useSyncExternalStore(subscribeToAccessToken, getAccessToken, () => null);
}
