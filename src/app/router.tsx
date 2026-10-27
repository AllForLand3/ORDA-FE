import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { MountainSelectPage } from '@/pages/MountainSelectPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignupPage } from '@/pages/SignupPage';
import { RouteSetupPage } from '@/pages/RouteSetupPage';
import { RouteResultsPage } from '@/pages/RouteResultsPage';
import { MyCoursesPage } from '@/pages/MyCoursesPage';
import { CourseDetailPage } from '@/pages/CourseDetailPage';
import { CourseEditPage } from '@/pages/CourseEditPage';
import { MyPage } from '@/pages/MyPage';
import { ProfileEditPage } from '@/pages/ProfileEditPage';

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
    path: '/terrain-3d',
    lazy: async () => ({ Component: (await import('@/pages/Terrain3DPage')).Terrain3DPage }),
  },
  {
    path: '/routes/setup',
    element: <RouteSetupPage />,
  },
  {
    path: '/routes/results',
    element: <RouteResultsPage />,
  },
  {
    path: '/my-courses',
    element: <MyCoursesPage />,
  },
  {
    path: '/my-courses/:courseId',
    element: <CourseDetailPage />,
  },
  {
    path: '/my-courses/:courseId/edit',
    element: <CourseEditPage />,
  },
  {
    path: '/my-page',
    element: <MyPage />,
  },
  {
    path: '/my-page/edit',
    element: <ProfileEditPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
