import { createContext, useContext } from 'react';

import type { CurrentUserResponse } from '../types/auth';

export interface AuthContextValue {
  currentUser: CurrentUserResponse | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isUnavailable: boolean;
  retryAuthentication: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
