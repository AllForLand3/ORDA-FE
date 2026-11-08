import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccessToken } from '@/shared/hooks/useAccessToken';

import { getMyCourses } from '../api/courseList';

export function useMyCoursesState() {
  const accessToken = useAccessToken();
  const [params, setParams] = useSearchParams();
  const rawPage = params.get('page');
  const tabParam = params.get('tab');
  const tab = tabParam === 'saved' || tabParam === 'imported' ? tabParam : 'all';
  const search = params.get('q') ?? '';
  const sortParam = params.get('sort');
  const sort = sortParam === 'oldest' || sortParam === 'name' ? sortParam : 'latest';
  const validPage =
    rawPage === null || (/^(0|[1-9]\d*)$/.test(rawPage) && Number(rawPage) <= 2147483647);
  const page = validPage ? Number(rawPage ?? 0) : 0;
  const query = useQuery({
    queryKey: ['courses', 'list', accessToken, page],
    queryFn: ({ signal }) => getMyCourses(page, signal),
    enabled: validPage,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
  const totalPages = query.data?.totalPages ?? 0;
  const lastPage = Math.max(0, totalPages - 1);
  const correcting = query.isSuccess && page > lastPage;

  useEffect(() => {
    if (validPage && !correcting) return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('page', String(validPage ? lastPage : 0));
        return next;
      },
      { replace: true },
    );
  }, [validPage, correcting, lastPage, setParams]);

  function goToPage(nextPage: number) {
    if (!Number.isInteger(nextPage) || nextPage < 0 || nextPage > 2147483647) return;
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(nextPage));
      return next;
    });
  }

  const listContextParams = new URLSearchParams();
  if (page > 0) listContextParams.set('listPage', String(page));
  if (params.has('q') || params.has('tab') || params.has('sort'))
    listContextParams.set('list', params.toString());
  const listContext = listContextParams.size ? '?' + listContextParams : '';
  const courses = query.isError || correcting ? [] : (query.data?.items ?? []);
  const visibleCourses = courses
    .filter(
      (course) =>
        (tab === 'all' ||
          (tab === 'imported' ? course.createType === 'IMPORT' : course.createType !== 'IMPORT')) &&
        (!search.trim() ||
          `${course.courseName} ${course.mountainName}`
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase())),
    )
    .slice()
    .sort((a, b) => {
      if (sort === 'name') return a.courseName.localeCompare(b.courseName, 'ko');
      const aDate = a.savedAt ? Date.parse(a.savedAt) : NaN;
      const bDate = b.savedAt ? Date.parse(b.savedAt) : NaN;
      if (!Number.isFinite(aDate) || !Number.isFinite(bDate)) return 0;
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
  const setOption = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  return {
    courses: visibleCourses,
    tab,
    search,
    sort,
    tabs: [
      { value: 'all', label: '전체', count: courses.length },
      {
        value: 'saved',
        label: '저장한 코스',
        count: courses.filter((course) => course.createType !== 'IMPORT').length,
      },
      {
        value: 'imported',
        label: '가져온 코스',
        count: courses.filter((course) => course.createType === 'IMPORT').length,
      },
    ],
    setTab: (value: string) => setOption('tab', value),
    setSearch: (value: string) => setOption('q', value),
    setSort: (value: string) => setOption('sort', value),
    totalElements: query.data?.totalElements ?? 0,
    totalPages,
    page,
    loading: !validPage || query.isPending || correcting,
    failed: query.isError,
    goToPage,
    retry: () => void query.refetch(),
    getDetailHref: (id: string) => '/my-courses/' + encodeURIComponent(id) + listContext,
    getEditHref: (id: string) => '/my-courses/' + encodeURIComponent(id) + '/edit' + listContext,
    getImportHref: () => '/my-courses/import',
  };
}
