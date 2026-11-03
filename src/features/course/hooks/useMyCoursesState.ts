import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccessToken } from '@/shared/hooks/useAccessToken';

import { getMyCourses } from '../api/courseList';

export function useMyCoursesState() {
  const accessToken = useAccessToken();
  const [params, setParams] = useSearchParams();
  const rawPage = params.get('page');
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

  const listContext = page > 0 ? '?listPage=' + page : '';
  return {
    courses: query.isError || correcting ? [] : (query.data?.items ?? []),
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
