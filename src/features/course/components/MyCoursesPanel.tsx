import { useState } from 'react';

import addIcon from '@/assets/course/course-add.svg';
import { Button, Dialog, Tabs, TextField } from '@/components/ui';

import type { useMyCoursesState } from '../hooks/useMyCoursesState';
import { MyCourseCard } from './MyCourseCard';

interface MyCoursesPanelProps {
  state: ReturnType<typeof useMyCoursesState>;
}

export function MyCoursesPanel({ state }: MyCoursesPanelProps) {
  const [uploadNoticeOpen, setUploadNoticeOpen] = useState(false);
  const selectedTab = state.tabs.find((item) => item.value === state.tab);
  const content = (
    <>
      <div className="my-courses-toolbar">
        <p>
          {selectedTab?.label}{' '}
          <strong>{state.preview === 'error' ? '—' : state.filteredCourses.length}</strong>
        </p>
        <label>
          <span className="sr-only">코스 정렬</span>
          <select onChange={(event) => state.setSort(event.target.value)} value={state.sort}>
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="name">이름순</option>
          </select>
        </label>
      </div>
      {state.preview === 'error' ? (
        <div className="my-courses-feedback" role="alert">
          <h2>코스 목록을 표시하지 못했어요</h2>
          <p>오류 UI 데모입니다. 실제 서버 요청이 실패한 상태는 아닙니다.</p>
          <Button onClick={() => state.setPreview('ready')} variant="secondary">
            예시 목록 다시 보기
          </Button>
        </div>
      ) : state.filteredCourses.length ? (
        <div className="my-courses-grid">
          {state.filteredCourses.map((course) => (
            <MyCourseCard
              analysisHref={state.getDetailHref(course.id, 'terrain')}
              course={course}
              detailHref={state.getDetailHref(course.id)}
              key={course.id}
            />
          ))}
        </div>
      ) : (
        <div className="my-courses-feedback" role="status">
          <h2>{state.query.trim() ? '검색 결과가 없어요' : '표시할 코스가 없어요'}</h2>
          <p>
            {state.query.trim()
              ? '다른 코스 이름이나 산 이름으로 검색해보세요.'
              : '빈 목록 UI 데모입니다. 아직 서버에 저장된 코스는 조회하지 않습니다.'}
          </p>
          {state.query.trim() ? (
            <Button onClick={state.resetSearch} variant="secondary">
              검색 초기화
            </Button>
          ) : (
            <Button onClick={() => state.setPreview('ready')} variant="secondary">
              예시 목록 보기
            </Button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="my-courses-panel">
      <header className="my-courses-intro">
        <div>
          <h1>내 코스</h1>
          <p>
            저장하거나 직접 만든 코스를
            <br />
            관리하고 다시 분석해보세요
          </p>
        </div>
        <div className="my-courses-upload">
          <Button onClick={() => setUploadNoticeOpen(true)} size="sm">
            <img alt="" aria-hidden="true" src={addIcon} />
            코스 업로드
          </Button>
          <small>(GeoJSON, GPX)</small>
        </div>
      </header>
      <p className="my-courses-demo-note">
        모든 코스·지표는 예시입니다. 저장·가져오기·편집·내보내기·삭제 기능은 미연결입니다.
      </p>
      <div className="my-courses-search">
        <TextField
          hideLabel
          label="내 코스 검색"
          onChange={(event) => state.setQuery(event.target.value)}
          placeholder="코스 이름이나 산 이름 검색"
          type="search"
          value={state.query}
          variant="search"
        />
        <label>
          <span className="sr-only">내 코스 목록 상태</span>
          <select onChange={(event) => state.setPreview(event.target.value)} value={state.preview}>
            <option value="ready">예시 목록</option>
            <option value="empty">빈 목록 데모</option>
            <option value="error">오류 데모</option>
          </select>
        </label>
      </div>
      <Tabs
        ariaLabel="내 코스 분류"
        items={state.tabs.map((item) => ({
          value: item.value,
          label: (
            <>
              {item.label}
              <span className="my-courses-tab-count">
                {state.preview === 'error' ? '—' : item.count}
              </span>
            </>
          ),
          content: state.tab === item.value ? content : null,
        }))}
        onValueChange={state.setTab}
        value={state.tab}
      />
      <Dialog
        description="GeoJSON·GPX 파일 업로드 기능은 아직 연결되지 않았습니다."
        footer={
          <Button onClick={() => setUploadNoticeOpen(false)} variant="secondary">
            닫기
          </Button>
        }
        onOpenChange={setUploadNoticeOpen}
        open={uploadNoticeOpen}
        title="코스 업로드 준비 중"
      >
        <p>현재는 예시 코스 목록과 상세 화면만 확인할 수 있어요.</p>
      </Dialog>
    </div>
  );
}
