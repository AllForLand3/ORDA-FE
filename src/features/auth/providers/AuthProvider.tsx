import { useSyncExternalStore, type PropsWithChildren } from 'react';

import { getAccessToken, subscribeToAccessToken } from '@/lib/accessToken';

import { useCurrentUserQuery } from '../hooks/useCurrentUserQuery';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const accessToken = useSyncExternalStore(subscribeToAccessToken, getAccessToken, () => null);
  const hasAccessToken = accessToken !== null;
  const currentUserQuery = useCurrentUserQuery(hasAccessToken);
  const value: AuthContextValue = {
    currentUser: hasAccessToken ? (currentUserQuery.data ?? null) : null,
    isAuthenticated: hasAccessToken && currentUserQuery.data !== undefined,
    isInitializing: hasAccessToken && (currentUserQuery.isLoading || currentUserQuery.isRefetching),
    isUnavailable: hasAccessToken && currentUserQuery.isError && !currentUserQuery.isFetching,
    retryAuthentication: () => {
      void currentUserQuery.refetch();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
