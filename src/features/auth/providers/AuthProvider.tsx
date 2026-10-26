import type { PropsWithChildren } from 'react';

import { getAccessToken } from '@/lib/accessToken';

import { useCurrentUserQuery } from '../hooks/useCurrentUserQuery';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const currentUserQuery = useCurrentUserQuery();
  const hasAccessToken = getAccessToken() !== null;
  const value: AuthContextValue = {
    currentUser: hasAccessToken ? (currentUserQuery.data ?? null) : null,
    isAuthenticated: hasAccessToken && currentUserQuery.data !== undefined,
    isInitializing: hasAccessToken && currentUserQuery.isLoading,
    isUnavailable: hasAccessToken && currentUserQuery.isError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
