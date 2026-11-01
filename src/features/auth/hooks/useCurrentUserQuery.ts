import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '../api/auth';

export const authQueryKeys = {
  currentUser: ['auth', 'current-user'] as const,
};

export function useCurrentUserQuery(enabled: boolean) {
  return useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: getCurrentUser,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
