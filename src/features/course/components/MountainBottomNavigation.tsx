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
      <span
        aria-disabled="true"
        aria-label="맞춤 경로, 준비 중"
        className="mountain-bottom-navigation__item is-unavailable"
      >
        <img alt="" aria-hidden="true" src={routeIcon} />
        <span>맞춤 경로</span>
      </span>
      <span
        aria-disabled="true"
        aria-label="내 코스, 준비 중"
        className="mountain-bottom-navigation__item is-unavailable"
      >
        <img alt="" aria-hidden="true" src={bookmarkIcon} />
        <span>내 코스</span>
      </span>
    </div>
  );
}
