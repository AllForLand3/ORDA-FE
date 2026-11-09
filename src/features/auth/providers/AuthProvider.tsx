import type { PropsWithChildren } from 'react';

import { useAccessToken } from '@/shared/hooks/useAccessToken';

import { useCurrentUserQuery } from '../hooks/useCurrentUserQuery';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const accessToken = useAccessToken();
  const hasAccessToken = accessToken !== null;
  const currentUserQuery = useCurrentUserQuery(hasAccessToken);
  const value: AuthContextValue = {
    currentUser: hasAccessToken ? (currentUserQuery.data ?? null) : null,

    isAuthenticated: hasAccessToken && currentUserQuery.data !== undefined,

    isInitializing:
      hasAccessToken && currentUserQuery.data === undefined && currentUserQuery.isFetching,

    isUnavailable:
      hasAccessToken &&
      currentUserQuery.data === undefined &&
      currentUserQuery.isError &&
      !currentUserQuery.isFetching,

    retryAuthentication: () => {
      void currentUserQuery.refetch();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
