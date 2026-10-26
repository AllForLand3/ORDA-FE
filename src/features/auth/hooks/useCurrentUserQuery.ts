import { useQuery } from '@tanstack/react-query';

import { getAccessToken } from '@/lib/accessToken';

import { getCurrentUser } from '../api/auth';

export const authQueryKeys = {
  currentUser: ['auth', 'current-user'] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: getCurrentUser,
    enabled: getAccessToken() !== null,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
