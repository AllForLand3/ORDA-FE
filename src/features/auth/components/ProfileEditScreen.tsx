import { useCallback, useState } from 'react';
import { Link, useBeforeUnload, useBlocker } from 'react-router-dom';

import backIcon from '@/assets/course/course-back.svg';
import { Button, Dialog, TextField } from '@/components/ui';

import avatar from '../assets/profile-avatar.svg';
import { MOCK_PROFILE } from '../mocks/profile';
import '../profile.css';

export function ProfileEditScreen() {
  const [name, setName] = useState<string>(MOCK_PROFILE.name);
  const isDirty = name !== MOCK_PROFILE.name;
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
          <Link to="/my-page">
            <img alt="" aria-hidden="true" src={backIcon} />
            <h1>내 정보 수정</h1>
          </Link>
          <Button aria-describedby="profile-edit-unavailable" disabled size="sm">
            저장
          </Button>
        </header>
        <img alt="예시 프로필 아이콘" className="profile-edit-avatar" src={avatar} />
        <div className="profile-edit-fields">
          <TextField
            label="이름"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <TextField
            disabled
            helperText="이메일은 변경할 수 없습니다"
            label="이메일"
            type="email"
            value={MOCK_PROFILE.email}
          />
          <section aria-labelledby="profile-edit-undecided" className="profile-edit-undecided">
            <h2 id="profile-edit-undecided">편집 도구</h2>
            <p>추가 입력 항목은 아직 확정되지 않았습니다. 현재는 이름 입력만 확인할 수 있습니다.</p>
          </section>
          <p className="profile-demo-note" id="profile-edit-unavailable">
            예시 입력입니다. 실제 프로필 조회·수정은 연결되지 않아 저장할 수 없습니다.
          </p>
        </div>
      </main>
      <Dialog
        description="입력한 예시 이름이 사라집니다. 실제 계정은 변경되지 않았습니다."
        footer={
          <>
            <Button onClick={() => blocker.reset?.()} variant="secondary">
              계속 보기
            </Button>
            <Button onClick={() => blocker.proceed?.()} variant="danger">
              입력 버리고 나가기
            </Button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        open={blocker.state === 'blocked'}
        title="내 정보 수정을 나갈까요?"
      >
        <p>현재 입력은 저장되지 않았습니다.</p>
      </Dialog>
    </div>
  );
}
