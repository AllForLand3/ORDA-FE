import { Link } from 'react-router-dom';

import bookmarkIcon from '@/assets/course/bookmark-nav.svg';
import mountainIcon from '@/assets/course/mountain-nav.svg';
import routeIcon from '@/assets/course/route-nav.svg';

export function MountainBottomNavigation() {
  return (
    <div className="mountain-bottom-navigation">
      <Link
        aria-current="page"
        aria-label="산 탐색, 현재 화면"
        className="mountain-bottom-navigation__item is-active"
        to="/mountains"
      >
        <img alt="" aria-hidden="true" src={mountainIcon} />
        <span>산 탐색</span>
      </Link>
      <Link className="mountain-bottom-navigation__item" to="/routes/setup">
        <img alt="" aria-hidden="true" src={routeIcon} />
        <span>맞춤 경로</span>
      </Link>
      <Link className="mountain-bottom-navigation__item" to="/my-courses">
        <img alt="" aria-hidden="true" src={bookmarkIcon} />
        <span>내 코스</span>
      </Link>
    </div>
  );
}
