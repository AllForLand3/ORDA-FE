import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui';

import { useAuth } from '../providers/authContext';
import { getSafeRedirectPath } from '../utils/redirect';

function AuthenticationStatus({ unavailable = false }: { unavailable?: boolean }) {
  const { retryAuthentication } = useAuth();

  return (
    <main className="auth-route auth-route-status">
      <section aria-live="polite" className="auth-route-status__card">
        <h1>{unavailable ? '로그인 상태를 확인하지 못했어요' : '로그인 상태 확인 중'}</h1>
        <p>
          {unavailable
            ? '서버 연결을 확인한 뒤 다시 시도해주세요.'
            : '저장된 로그인 정보를 확인하고 있습니다.'}
        </p>
        {unavailable ? <Button onClick={retryAuthentication}>다시 시도</Button> : null}
      </section>
    </main>
  );
}

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
  const location = useLocation();
  const { isAuthenticated, isInitializing, isUnavailable } = useAuth();

  if (isInitializing) {
    return <AuthenticationStatus />;
  }

  if (isUnavailable) {
    return <AuthenticationStatus unavailable />;
  }

  if (isAuthenticated) {
    const requestedPath = new URLSearchParams(location.search).get('redirect');
    return <Navigate replace to={getSafeRedirectPath(requestedPath)} />;
  }

  return <Outlet />;
}
