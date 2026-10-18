import { Link } from 'react-router-dom';

import arrowRight from '@/assets/home/arrow-right.svg';
import homeLogoMark from '@/assets/home/logo-mark.png';
import homeLogoTile from '@/assets/home/logo-tile.svg';
import homeMountain from '@/assets/home/mountain-background.png';
import homeTrail from '@/assets/home/trail.svg';
import './HomePage.css';

export function HomePage() {
  return (
    <main className="home-page">
      <section
        aria-labelledby="home-title"
        aria-label="오르다 모바일 홈"
        className="home-page__mobile"
      >
        <div aria-hidden="true" className="home-page__background">
          <img alt="" className="home-page__mountain" src={homeMountain} />
          <div className="home-page__wash" />
        </div>

        <div aria-label="ORDA 로고" className="home-page__logo" role="img">
          <img alt="" className="home-page__logo-tile" src={homeLogoTile} />
          <img alt="" className="home-page__logo-mark" src={homeLogoMark} />
        </div>

        <img alt="" aria-hidden="true" className="home-page__trail" src={homeTrail} />

        <div className="home-page__copy">
          <h1 className="home-page__title" id="home-title">
            <span>나에게 맞는</span>
            <span>산길을, 더 쉽게</span>
          </h1>
          <p className="home-page__description">
            <span>지도와 데이터를 기반으로</span>
            <span>당신만의 등산 코스를 찾아보세요.</span>
          </p>
        </div>

        <nav aria-label="계정 메뉴" className="home-page__actions">
          <Link
            className="orda-button orda-button--primary orda-button--lg orda-button--full home-page__action home-page__action--login"
            to="/login"
          >
            <span>로그인하기</span>
            <img alt="" aria-hidden="true" className="home-page__arrow" src={arrowRight} />
          </Link>
          <Link
            className="orda-button orda-button--secondary orda-button--lg orda-button--full home-page__action home-page__action--signup"
            to="/signup"
          >
            회원가입하기
          </Link>
        </nav>
      </section>

      <section aria-label="ORDA 홈" className="home-page__desktop">
        <div>
          <h1 className="text-4xl font-bold text-orda-primary">산길</h1>
          <p className="mt-3 text-orda-text-muted">나만의 등산 경로를 탐색하세요.</p>
        </div>
      </section>
    </main>
  );
}
