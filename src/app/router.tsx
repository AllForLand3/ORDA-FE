import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { MountainSelectPage } from '@/pages/MountainSelectPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignupPage } from '@/pages/SignupPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/mountains',
    element: <MountainSelectPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
