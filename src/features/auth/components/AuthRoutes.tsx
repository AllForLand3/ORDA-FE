import { Navigate, Outlet } from 'react-router-dom';

import { AuthenticationStatus } from './AuthenticationStatus';

import { useAuth } from '../providers/authContext';

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing, isUnavailable } = useAuth();

  if (isInitializing) {
    return <AuthenticationStatus />;
  }

  if (isUnavailable) {
    return <AuthenticationStatus unavailable />;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing, isUnavailable } = useAuth();

  if (isInitializing) {
    return <AuthenticationStatus />;
  }

  if (isUnavailable) {
    return <AuthenticationStatus unavailable />;
  }

  if (isAuthenticated) {
    return <Navigate replace to="/mountains" />;
  }
  return <Outlet />;
}
