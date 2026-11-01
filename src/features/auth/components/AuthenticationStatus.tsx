import { Button } from '@/components/ui';

import { useAuth } from '../providers/authContext';

export function AuthenticationStatus({ unavailable = false }: { unavailable?: boolean }) {
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
