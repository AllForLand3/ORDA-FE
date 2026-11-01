import { Link } from 'react-router-dom';

import desktopArrowRight from '@/assets/home/desktop-arrow-right.svg';
import desktopLogo from '@/assets/home/desktop-logo.png';
import desktopMountain from '@/assets/home/desktop-mountain-background.png';
import arrowRight from '@/assets/home/arrow-right.svg';
import homeLogoMark from '@/assets/home/logo-mark.png';
import homeLogoTile from '@/assets/home/logo-tile.svg';
import homeMountain from '@/assets/home/mountain-background.png';
import './HomePage.css';

const serviceMenuItems = ['서비스 소개', '주요 기능', '코스 추천', '이용 안내'];

export function HomePage() {
  return (
    <main className="home-page">
      <section aria-labelledby="home-title" className="home-page__stage">
        <div aria-hidden="true" className="home-page__background">
          <picture className="home-page__background-picture">
            <source media="(min-width: 48rem)" srcSet={desktopMountain} />
            <img alt="" className="home-page__mountain" src={homeMountain} />
          </picture>
          <div className="home-page__wash" />
        </div>

        <div aria-label="ORDA 로고" className="home-page__logo-mobile" role="img">
          <img alt="" className="home-page__logo-tile" src={homeLogoTile} />
          <img alt="" className="home-page__logo-mark" src={homeLogoMark} />
        </div>

        <header aria-label="ORDA 홈 헤더" className="home-page__header">
          <div className="home-page__header-brand">
            <img alt="ORDA 로고" className="home-page__desktop-logo" src={desktopLogo} />
            <ul
              aria-label="서비스 메뉴. 화면 이동은 아직 준비 중입니다."
              className="home-page__menu"
            >
              {serviceMenuItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <nav aria-label="계정" className="home-page__header-actions">
            <Link className="home-page__header-action home-page__header-action--login" to="/login">
              로그인
            </Link>
            <Link
              className="home-page__header-action home-page__header-action--signup"
              to="/signup"
            >
              회원가입
            </Link>
          </nav>
        </header>

        <div className="home-page__copy">
          <h1 className="home-page__title" id="home-title">
            <span>나에게 맞는</span>
            <span>
              <span className="home-page__title-highlight">산길</span>을,{' '}
              <span className="home-page__title-highlight">더 쉽게</span>
            </span>
          </h1>
          <p className="home-page__description">
            <span>지도와 데이터를 기반으로</span>
            <span>당신만의 등산 코스를 찾아보세요.</span>
          </p>

          <nav aria-label="시작하기" className="home-page__actions">
            <Link
              className="orda-button orda-button--primary orda-button--lg home-page__action home-page__action--login"
              to="/login"
            >
              <span>로그인하기</span>
              <picture aria-hidden="true" className="home-page__arrow">
                <source media="(min-width: 48rem)" srcSet={desktopArrowRight} />
                <img alt="" src={arrowRight} />
              </picture>
            </Link>
            <Link
              className="orda-button orda-button--secondary orda-button--lg home-page__action home-page__action--signup"
              to="/signup"
            >
              회원가입하기
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
