import { useState } from 'react';

import archiveIcon from '@/assets/route/archive.svg';
import deleteIcon from '@/assets/route/delete.svg';
import { Button, Dialog, TextArea, TextField } from '@/components/ui';

import type { MockRouteCandidate } from '../mocks/route-results';

interface RouteEditDialogProps {
  candidate: MockRouteCandidate;
  onClose: () => void;
}

export function RouteEditDialog({ candidate, onClose }: RouteEditDialogProps) {
  // 닫을 때 컴포넌트를 해제하여 입력을 버린다. 저장·삭제·API 연결은 하지 않는다.
  const [name, setName] = useState(candidate.name);
  const [memo, setMemo] = useState(candidate.memo);

  return (
    <div className="route-edit-dialog">
      <Dialog
        closeLabel="코스 편집 닫기"
        footer={
          <>
            <Button
              aria-describedby="route-edit-demo-note"
              className="route-edit-dialog__delete"
              disabled
              variant="quiet"
            >
              <img alt="" aria-hidden="true" src={deleteIcon} />
              삭제
            </Button>
            <Button onClick={onClose} variant="secondary">
              취소
            </Button>
            <Button aria-describedby="route-edit-demo-note" disabled>
              <img alt="" aria-hidden="true" src={archiveIcon} />
              저장
            </Button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        open
        title="코스 편집"
      >
        <div className="route-edit-dialog__form">
          <div className="route-edit-dialog__preview" role="note">
            경로 미리보기 미제공
          </div>
          <TextField
            label="코스 이름"
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <TextArea
            label="메모"
            maxLength={500}
            onChange={(event) => setMemo(event.target.value)}
            rows={3}
            value={memo}
          />
          <p className="route-edit-dialog__note" id="route-edit-demo-note">
            임시 입력입니다. 저장·삭제 기능은 연결되지 않았어요.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
