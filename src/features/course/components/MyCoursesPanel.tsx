import { useNavigate } from 'react-router-dom';

import addIcon from '@/assets/course/course-add.svg';
import { Button, Tabs, TextField } from '@/components/ui';
import { Select } from '@/components/ui/Select';

import type { useMyCoursesState } from '../hooks/useMyCoursesState';
import { MyCourseCard } from './MyCourseCard';

interface MyCoursesPanelProps {
  state: ReturnType<typeof useMyCoursesState>;
}

export function MyCoursesPanel({ state }: MyCoursesPanelProps) {
  const navigate = useNavigate();

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
          <Button onClick={() => navigate(state.getImportHref())} size="sm">
            <img alt="" aria-hidden="true" src={addIcon} />
            코스 업로드
          </Button>
          <small>(GeoJSON)</small>
        </div>
      </header>
      <p className="my-courses-demo-note">
        검색·정렬·분류는 현재 페이지의 코스에만 적용됩니다. 썸네일은 예시 이미지입니다.
      </p>
      <div className="my-courses-search">
        <TextField
          hideLabel
          label="내 코스 검색"
          placeholder="현재 페이지의 코스 이름이나 산 이름 검색"
          value={state.search}
          onChange={(event) => state.setSearch(event.target.value)}
          variant="search"
        />
        <Select
          ariaLabel="코스 정렬"
          className="my-courses-sort"
          value={state.sort}
          onValueChange={state.setSort}
          options={[
            { value: 'latest', label: '최신순' },
            { value: 'oldest', label: '오래된순' },
            { value: 'name', label: '이름순' },
          ]}
        />
      </div>
      <Tabs
        ariaLabel="내 코스 분류"
        value={state.tab}
        onValueChange={state.setTab}
        items={state.tabs.map((tab) => ({
          value: tab.value,
          label: (
            <>
              {tab.label}
              <span className="my-courses-tab-count">{tab.count}</span>
            </>
          ),
          content: null,
        }))}
      />
      {state.loading ? (
        <div className="my-courses-feedback" role="status" aria-busy="true">
          코스 목록을 불러오는 중입니다.
        </div>
      ) : state.failed ? (
        <div className="my-courses-feedback" role="alert">
          <h2>코스 목록을 불러오지 못했어요</h2>
          <Button onClick={state.retry} variant="secondary">
            다시 시도
          </Button>
        </div>
      ) : (
        <>
          <div className="my-courses-toolbar">
            <p>
              전체 <strong>{state.totalElements}</strong>
            </p>
          </div>
          {state.courses.length ? (
            <div className="my-courses-grid">
              {state.courses.map((course) => (
                <MyCourseCard
                  course={course}
                  detailHref={state.getDetailHref(course.courseId)}
                  editHref={state.getEditHref(course.courseId)}
                  key={course.courseId}
                />
              ))}
            </div>
          ) : (
            <div className="my-courses-feedback" role="status">
              <h2>
                {state.totalElements
                  ? '현재 페이지에 조건에 맞는 코스가 없어요'
                  : '저장한 코스가 없어요'}
              </h2>
              <p>
                {state.totalElements
                  ? '검색·분류 조건을 바꾸거나 다른 페이지를 확인해주세요.'
                  : '코스를 업로드하면 이곳에서 확인할 수 있습니다.'}
              </p>
            </div>
          )}
        </>
      )}
      {(state.totalPages > 1 || state.page > 0) && (
        <nav aria-label="코스 목록 페이지" className="my-courses-pagination">
          <Button
            variant="secondary"
            size="sm"
            disabled={state.loading || state.page === 0}
            onClick={() => state.goToPage(state.page - 1)}
          >
            이전 페이지
          </Button>
          <span aria-live="polite" aria-atomic="true">
            <strong>{state.page + 1}</strong>
            {state.totalPages > 0 ? ' / ' + state.totalPages + ' 페이지' : ' 페이지'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={state.loading || state.failed || state.page + 1 >= state.totalPages}
            onClick={() => state.goToPage(state.page + 1)}
          >
            다음 페이지
          </Button>
        </nav>
      )}
    </div>
  );
}
