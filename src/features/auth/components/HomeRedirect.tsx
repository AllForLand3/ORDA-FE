import { Navigate } from 'react-router-dom';

import { HomePage } from '@/pages/HomePage';

import { useAuth } from '../providers/authContext';

export function HomeRedirect() {
  const { isAuthenticated, isInitializing, isUnavailable, retryAuthentication } = useAuth();

  if (isInitializing) {
    return (
      <main className="auth-route auth-route-status">
        <section className="auth-route-status__card">
          <h1>로그인 상태 확인 중</h1>
          <p>저장된 로그인 정보를 확인하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (isUnavailable) {
    return (
      <main className="auth-route auth-route-status">
        <section className="auth-route-status__card">
          <h1>로그인 상태를 확인하지 못했어요</h1>
          <p>서버 연결을 확인한 뒤 다시 시도해주세요.</p>
          <button type="button" onClick={retryAuthentication}>
            다시 시도
          </button>
        </section>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/mountains" replace />;
  }

  return <HomePage />;
}
