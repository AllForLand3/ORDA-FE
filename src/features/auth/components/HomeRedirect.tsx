import { Navigate } from 'react-router-dom';

import { HomePage } from '@/pages/HomePage';

import { useAuth } from '../providers/authContext';
import { AuthenticationStatus } from './AuthenticationStatus';

export function HomeRedirect() {
  const { isAuthenticated, isInitializing, isUnavailable } = useAuth();

  if (isInitializing) {
    return <AuthenticationStatus />;
  }

  if (isUnavailable) {
    return <AuthenticationStatus unavailable />;
  }

  if (isAuthenticated) {
    return <Navigate to="/mountains" replace />;
  }

  return <HomePage />;
}
