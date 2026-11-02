import { useQuery } from '@tanstack/react-query';

import { getMyCourses } from '../api/courseList';

export function useMyCoursesState() {
  const query = useQuery({
    queryKey: ['courses', 'list'],
    queryFn: ({ signal }) => getMyCourses(signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  return {
    courses: query.isError ? [] : (query.data ?? []),
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    getDetailHref: (id: string) => `/my-courses/${encodeURIComponent(id)}`,
    getEditHref: (id: string) => `/my-courses/${encodeURIComponent(id)}/edit`,
    getImportHref: () => '/my-courses/import',
  };
}
