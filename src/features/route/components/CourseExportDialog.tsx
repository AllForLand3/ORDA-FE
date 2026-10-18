import { useState } from 'react';

import infoIcon from '@/assets/route/export-info.svg';
import previewCheck from '@/assets/route/export-preview-check.svg';
import selectedIcon from '@/assets/route/export-selected.svg';
import unselectedIcon from '@/assets/route/export-unselected.svg';
import { Button, Dialog } from '@/components/ui';

import '../course-export.css';

interface CourseExportDialogProps {
  courseName: string;
  onOpenChange: (open: boolean) => void;
}

// 열 때만 마운트한다. 닫았다 다시 열면 GPX 선택·미리보기 상태를 초기화한다.
// 코스 도메인·Geometry·API 계약과 무관한 형식 선택 UI다. 파일 생성은 하지 않는다.
export function CourseExportDialog({ courseName, onOpenChange }: CourseExportDialogProps) {
  const [format, setFormat] = useState<'GPX' | 'GeoJSON'>('GPX');
  const [preview, setPreview] = useState(false);

  return (
    <div className={`course-export-overlay${preview ? ' course-export-overlay--preview' : ''}`}>
      <Dialog
        closeLabel="내보내기 닫기"
        description={
          preview
            ? '디자인 미리보기 · 파일 생성 및 다운로드 안 됨'
            : `${courseName}를 어떤 형식으로 내보낼까요?`
        }
        footer={
          preview ? (
            <Button fullWidth onClick={() => onOpenChange(false)}>
              확인
            </Button>
          ) : (
            <>
              <Button onClick={() => onOpenChange(false)} variant="secondary">
                취소
              </Button>
              <Button aria-describedby="course-export-unavailable" disabled>
                내보내기
              </Button>
            </>
          )
        }
        onOpenChange={onOpenChange}
        open
        title={preview ? '코스 내보내기 완료 화면 미리보기' : '코스 내보내기'}
      >
        {preview ? (
          <div className="course-export-preview">
            <img alt="" aria-hidden="true" src={previewCheck} />
            <h3>완료 화면 미리보기</h3>
            <p>
              {courseName}
              <br />
              선택한 형식: {format}
            </p>
            <strong role="status">파일은 생성되거나 저장되지 않았습니다.</strong>
            <Button onClick={() => setPreview(false)} size="sm" variant="quiet">
              형식 선택으로 돌아가기
            </Button>
          </div>
        ) : (
          <>
            <fieldset className="course-export-formats">
              <legend className="sr-only">내보내기 형식</legend>
              {[
                { value: 'GPX', description: '등산·지도 앱에서 사용할 수 있는 표준 형식입니다.' },
                {
                  value: 'GeoJSON',
                  description: 'GIS 및 공간정보 프로그램에서 활용하기 좋은 형식입니다.',
                },
              ].map((option) => (
                <label key={option.value}>
                  <input
                    checked={format === option.value}
                    name="course-export-format"
                    onChange={() => setFormat(option.value === 'GPX' ? 'GPX' : 'GeoJSON')}
                    type="radio"
                    value={option.value}
                  />
                  <img
                    alt=""
                    aria-hidden="true"
                    src={format === option.value ? selectedIcon : unselectedIcon}
                  />
                  <span>
                    <strong>{option.value}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="course-export-info" id="course-export-unavailable" role="note">
              <img alt="" aria-hidden="true" src={infoIcon} />
              <p>
                실제 코스 경로와 다운로드 기능이 연결되지 않았습니다. 파일을 저장할 수 없습니다.
              </p>
            </div>
            <Button
              className="course-export-preview-entry"
              onClick={() => setPreview(true)}
              size="sm"
              variant="quiet"
            >
              완료 화면 미리보기
            </Button>
          </>
        )}
      </Dialog>
    </div>
  );
}
