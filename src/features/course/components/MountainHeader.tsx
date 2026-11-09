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
          <span>마이페이지</span>
        </Link>
      </div>
    </div>
  );
}
