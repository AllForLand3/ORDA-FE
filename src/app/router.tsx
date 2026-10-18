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
    path: '*',
    element: <NotFoundPage />,
  },
]);
