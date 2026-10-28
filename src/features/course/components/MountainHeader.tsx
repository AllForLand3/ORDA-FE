import { Link } from 'react-router-dom';

import logoMark from '@/assets/home/logo-mark.png';

import './mountain-select.css';

export function MountainHeader() {
  return (
    <div className="mountain-explorer-header">
      <Link
        aria-label="ORDA 산 탐색으로 이동"
        className="mountain-explorer-header__brand"
        to="/mountains"
      >
        <img alt="" aria-hidden="true" src={logoMark} />
      </Link>
      <div className="mountain-explorer-header__actions">
        <Link className="mountain-explorer-header__my-courses" to="/my-courses">
          내 코스
        </Link>
        <Link
          aria-label="마이페이지로 이동"
          className="mountain-explorer-header__account"
          to="/my-page"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.5 20c.5-3.45 2.8-5.25 6.5-5.25s6 1.8 6.5 5.25" />
          </svg>
          <span>마이페이지</span>
        </Link>
      </div>
    </div>
  );
}
