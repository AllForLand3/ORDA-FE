import { useSearchParams } from 'react-router-dom';

import { MOCK_MY_COURSES } from '../mocks/my-courses';

export const MY_COURSE_TABS = [
  { value: 'all', label: '전체' },
  { value: 'saved', label: '저장한 코스' },
  { value: 'imported', label: '가져온 코스' },
] as const;

export function useMyCoursesState() {
  const [params, setParams] = useSearchParams();
  const tab = MY_COURSE_TABS.find((item) => item.value === params.get('tab'))?.value ?? 'saved';
  const query = params.get('q') ?? '';
  const sortParam = params.get('sort');
  const sort = sortParam === 'oldest' || sortParam === 'name' ? sortParam : 'latest';
  const previewParam = params.get('preview');
  const preview = previewParam === 'empty' || previewParam === 'error' ? previewParam : 'ready';

  // 향후 목록 조회 연결 지점: 현재는 아래 명시적 Mock만 사용한다. API 계약은 정의하지 않는다.
  const courses = preview === 'ready' ? MOCK_MY_COURSES : [];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCourses = courses
    .filter(
      (course) =>
        (tab === 'all' || course.category === tab) &&
        `${course.name} ${course.mountainName} ${course.description}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
    )
    .sort((left, right) =>
      sort === 'name'
        ? left.name.localeCompare(right.name, 'ko')
        : sort === 'oldest'
          ? left.date.localeCompare(right.date)
          : right.date.localeCompare(left.date),
    );

  function update(key: string, value: string, replace = true) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace },
    );
  }

  return {
    tab,
    query,
    sort,
    preview,
    filteredCourses,
    tabs: MY_COURSE_TABS.map((item) => ({
      ...item,
      count: courses.filter((course) => item.value === 'all' || course.category === item.value)
        .length,
    })),
    setTab: (value: string) => {
      if (MY_COURSE_TABS.some((item) => item.value === value)) update('tab', value, false);
    },
    setQuery: (value: string) => update('q', value),
    setSort: (value: string) => {
      if (value === 'latest' || value === 'oldest' || value === 'name') update('sort', value);
    },
    setPreview: (value: string) => {
      if (value === 'ready' || value === 'empty' || value === 'error') update('preview', value);
    },
    resetSearch: () => update('q', ''),
    getDetailHref: (id: string, detailTab = 'overview') =>
      `/my-courses/${encodeURIComponent(id)}?${new URLSearchParams({ tab: detailTab, list: params.toString() })}`,
  };
}
