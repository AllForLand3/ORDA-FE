import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import logoMark from '@/assets/home/logo-mark.png';
import { Button } from '@/components/ui';
import { clearAccessToken } from '@/lib/accessToken';

import avatar from '../assets/profile-avatar.svg';
import logoutIcon from '../assets/profile-logout.svg';
import nextIcon from '../assets/profile-next.svg';
import { useAuth } from '../providers/authContext';
import '../profile.css';

export function ProfileScreen({ navigation }: { navigation: ReactNode }) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  function logout() {
    clearAccessToken();
    queryClient.clear();
    window.location.replace('/');
  }

  return (
    <div className="profile-page">
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
            <Link className="my-courses-site-header__my-courses" to="/my-courses">
              내 코스
            </Link>
            <Link aria-current="page" className="my-courses-site-header__login" to="/my-page">
              마이페이지
            </Link>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <header className="profile-heading">
          <span>MY PAGE</span>
          <h1>마이페이지</h1>
          <p>계정 정보를 확인하고 관리할 수 있어요.</p>
        </header>

        <section aria-labelledby="profile-information-title" className="profile-information">
          <div className="profile-information__heading">
            <div>
              <h2 id="profile-information-title">내 정보</h2>
              <p>현재 로그인된 계정 정보입니다.</p>
            </div>
          </div>

          <div className="profile-information__user">
            <img alt="" aria-hidden="true" src={avatar} />
            <div>
              <strong>{currentUser?.nickname ?? '사용자'}</strong>
              <span>{currentUser?.loginId ?? '-'}</span>
            </div>
          </div>

          <Link className="profile-information__edit" to="/my-page/edit">
            <span>
              <strong>내 정보 수정</strong>
              <small>닉네임과 계정 정보를 확인해보세요.</small>
            </span>
            <img alt="" aria-hidden="true" src={nextIcon} />
          </Link>
        </section>

        <Button className="profile-logout" variant="quiet" fullWidth onClick={logout}>
          <img alt="" aria-hidden="true" src={logoutIcon} />
          로그아웃
        </Button>
      </main>

      <div className="profile-mobile-navigation">{navigation}</div>
    </div>
  );
}
