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
          <Link
            aria-label="ORDA 산 탐색으로 이동"
            className="my-courses-site-header__logo"
            to="/mountains"
          >
            <img alt="" src={logoMark} />
            <span>ORDA</span>
          </Link>
          <div className="my-courses-site-header__actions">
            <Link
              aria-current="page"
              className="my-courses-site-header__my-courses"
              to="/my-courses"
            >
              내 코스
            </Link>
            <Link className="my-courses-site-header__login" to="/my-page">
              <span>마이페이지</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="my-courses-main">
        <MyCoursesPanel state={state} />
      </main>
      <MyCoursesNavigation />
    </div>
  );
}
