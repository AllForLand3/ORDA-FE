import { useCallback, useState } from 'react';
import { Link, useBeforeUnload, useBlocker } from 'react-router-dom';

import backIcon from '@/assets/course/course-back.svg';
import { Button, Dialog, TextField } from '@/components/ui';

import avatar from '../assets/profile-avatar.svg';
import { useAuth } from '../providers/authContext';
import '../profile.css';

export function ProfileEditScreen() {
  const { currentUser } = useAuth();
  const initialNickname = currentUser?.nickname ?? '';
  const [nickname, setNickname] = useState(initialNickname);
  const isDirty = nickname !== initialNickname;
  const blocker = useBlocker(isDirty);

  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!isDirty) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [isDirty],
    ),
  );

  return (
    <div className="profile-edit-route">
      <main className="profile-edit-page">
        <header className="profile-edit-header">
          <div className="profile-edit-header__title">
            <Link aria-label="마이페이지로 돌아가기" to="/my-page">
              <img alt="" aria-hidden="true" src={backIcon} />
            </Link>
            <div>
              <span>MY PROFILE</span>
              <h1>내 정보 수정</h1>
            </div>
          </div>
          <Button aria-describedby="profile-edit-unavailable" disabled size="sm">
            저장
          </Button>
        </header>

        <section aria-label="프로필 정보" className="profile-edit-card">
          <div className="profile-edit-card__user">
            <img alt="" aria-hidden="true" className="profile-edit-avatar" src={avatar} />
            <div>
              <strong>{currentUser?.nickname ?? '사용자'}</strong>
              <span>{currentUser?.loginId ?? '-'}</span>
            </div>
          </div>

          <div className="profile-edit-fields">
            <TextField
              autoComplete="nickname"
              helperText="2~10자, 한글·영문·숫자를 사용할 수 있어요."
              label="닉네임"
              maxLength={10}
              onChange={(event) => setNickname(event.target.value)}
              value={nickname}
            />
            <TextField
              disabled
              helperText="아이디는 변경할 수 없습니다."
              label="아이디"
              value={currentUser?.loginId ?? ''}
            />
          </div>
        </section>

        <p className="profile-edit-notice" id="profile-edit-unavailable">
          프로필 수정 API 연결 후 변경한 정보를 저장할 수 있습니다.
        </p>
      </main>

      <Dialog
        description="변경한 닉네임이 저장되지 않고 사라집니다."
        footer={
          <>
            <Button onClick={() => blocker.reset?.()} variant="secondary">
              계속 수정하기
            </Button>
            <Button onClick={() => blocker.proceed?.()} variant="danger">
              나가기
            </Button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        open={blocker.state === 'blocked'}
        title="내 정보 수정을 나갈까요?"
      >
        <p>현재 변경 사항은 저장되지 않았습니다.</p>
      </Dialog>
    </div>
  );
}
