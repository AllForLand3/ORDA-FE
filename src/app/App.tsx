import { RouterProvider } from 'react-router-dom';

import { router } from '@/app/router';
import { useAuth } from '@/features/auth';
import { ChatAssistant } from '@/features/chat';

export function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <RouterProvider router={router} />
      {/* 서비스 이용 안내 챗봇은 로그인한 사용자에게만 보인다. */}
      {isAuthenticated ? <ChatAssistant /> : null}
    </>
  );
}
