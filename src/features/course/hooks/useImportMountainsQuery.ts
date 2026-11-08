import { useInfiniteQuery } from '@tanstack/react-query';
import { getImportMountains } from '../api/mountains';

export function useImportMountainsQuery() {
  return useInfiniteQuery({
    queryKey: ['mountains', 'import-options'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => getImportMountains(pageParam, signal),
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    retry: false,
  });
}
