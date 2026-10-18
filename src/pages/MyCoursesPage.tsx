import { Link } from 'react-router-dom';

import logoMark from '@/assets/home/logo-mark.png';
import { MyCoursesNavigation, MyCoursesPanel, useMyCoursesState } from '@/features/course';
import '@/features/course/components/my-courses.css';

import './my-courses.css';

export function MyCoursesPage() {
  const state = useMyCoursesState();

  return (
    <div className="my-courses-page">
      <header className="my-courses-site-header">
        <div className="my-courses-site-header__inner">
          <Link aria-label="ORDA 홈" className="my-courses-site-header__logo" to="/">
            <img alt="" src={logoMark} />
          </Link>
          <MyCoursesNavigation />
          <Link className="my-courses-site-header__login" to="/login">
            로그인
          </Link>
        </div>
      </header>
      <main className="my-courses-main">
        <MyCoursesPanel state={state} />
      </main>
    </div>
  );
}
