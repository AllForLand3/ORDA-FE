import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button, Dialog } from '@/components/ui';

import accountIcon from '../assets/profile-account.svg';
import avatar from '../assets/profile-avatar.svg';
import downloadIcon from '../assets/profile-download.svg';
import logoutIcon from '../assets/profile-logout.svg';
import mountain from '../assets/profile-mountain.png';
import nextIcon from '../assets/profile-next.svg';
import settingsIcon from '../assets/profile-settings.svg';
import { MOCK_PROFILE } from '../mocks/profile';
import '../profile.css';

const NOTICES = {
  downloads: {
    title: '다운로드 파일 준비 중',
    message:
      '아직 생성하거나 다운로드한 파일이 없습니다. GPX·GeoJSON 내보내기는 형식 선택 UI만 제공합니다.',
  },
  settings: {
    title: '앱 설정 준비 중',
    message: '설정 항목과 저장 정책이 확정되지 않았습니다. 현재 변경할 수 있는 설정은 없습니다.',
  },
  logout: {
    title: '로그아웃 미연결',
    message:
      '현재 예시 프로필 화면이며 로그인 세션이 없습니다. 서버 로그아웃이나 계정 변경은 수행하지 않았습니다.',
  },
};

export function ProfileScreen({ navigation }: { navigation: ReactNode }) {
  const [notice, setNotice] = useState<keyof typeof NOTICES | null>(null);
  const activeNotice = notice ? NOTICES[notice] : null;

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <img alt="" aria-hidden="true" className="profile-hero__image" src={mountain} />
        <header>
          <h1>마이페이지</h1>
          <p>내 정보를 관리해보세요</p>
        </header>
      </div>
      <main className="profile-main">
        <Link className="profile-summary" to="/my-page/edit">
          <img alt="" aria-hidden="true" src={avatar} />
          <span>
            <strong>{MOCK_PROFILE.name}</strong>
            <small>{MOCK_PROFILE.email}</small>
          </span>
          <img alt="" aria-hidden="true" src={nextIcon} />
        </Link>
        <nav aria-label="마이페이지 메뉴" className="profile-menu">
          <Link to="/my-page/edit">
            <img alt="" aria-hidden="true" src={accountIcon} />
            <span>
              <strong>내 정보 수정</strong>
              <small>프로필, 이메일, 소개 등</small>
            </span>
            <img alt="" aria-hidden="true" src={nextIcon} />
          </Link>
          <button onClick={() => setNotice('downloads')} type="button">
            <img alt="" aria-hidden="true" src={downloadIcon} />
            <span>
              <strong>다운로드 파일</strong>
              <small>내보낸 GPX, GeoJSON 파일</small>
            </span>
            <img alt="" aria-hidden="true" src={nextIcon} />
          </button>
          <button onClick={() => setNotice('settings')} type="button">
            <img alt="" aria-hidden="true" src={settingsIcon} />
            <span>
              <strong>앱 설정</strong>
            </span>
            <img alt="" aria-hidden="true" src={nextIcon} />
          </button>
        </nav>
        <Button className="profile-logout" fullWidth onClick={() => setNotice('logout')}>
          <img alt="" aria-hidden="true" src={logoutIcon} />
          로그아웃
        </Button>
        <p className="profile-demo-note">
          예시 프로필입니다. 실제 계정 조회·수정·로그아웃은 연결되지 않았습니다.
        </p>
      </main>
      {navigation}
      <Dialog
        description={activeNotice?.message}
        footer={
          <Button onClick={() => setNotice(null)} variant="secondary">
            닫기
          </Button>
        }
        onOpenChange={(open) => {
          if (!open) setNotice(null);
        }}
        open={Boolean(activeNotice)}
        title={activeNotice?.title ?? '기능 안내'}
      >
        {notice === 'downloads' ? <Link to="/my-courses">내 코스에서 내보내기 UI 확인</Link> : null}
      </Dialog>
    </div>
  );
}
