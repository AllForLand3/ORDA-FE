import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AuthenticationStatus } from './AuthenticationStatus';

import { useAuth } from '../providers/authContext';

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isInitializing, isUnavailable } = useAuth();

  if (isInitializing) {
    return <AuthenticationStatus />;
  }

  if (isUnavailable) {
    return <AuthenticationStatus unavailable />;
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/login?redirect=${encodeURIComponent(from)}`} />;
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
