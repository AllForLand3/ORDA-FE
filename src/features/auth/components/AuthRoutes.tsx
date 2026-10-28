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
    const redirect = `${location.pathname}${location.search}`;

    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
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
