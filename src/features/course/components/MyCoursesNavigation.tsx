import { Link } from 'react-router-dom';

import bookmarkIcon from '@/assets/course/bookmark-active.svg';
import mountainIcon from '@/assets/route/mountain-navigation.svg';
import routeIcon from '@/assets/course/route-nav.svg';

export function MyCoursesNavigation() {
  return (
    <nav aria-label="내 코스 내비게이션" className="my-courses-navigation">
      <Link to="/mountains">
        <img alt="" aria-hidden="true" src={mountainIcon} />
        <span>산 탐색</span>
      </Link>
      <Link to="/routes/setup">
        <img alt="" aria-hidden="true" src={routeIcon} />
        <span>맞춤 경로</span>
      </Link>
      <Link aria-current="page" to="/my-courses">
        <img alt="" aria-hidden="true" src={bookmarkIcon} />
        <span>내 코스</span>
      </Link>
    </nav>
  );
}
