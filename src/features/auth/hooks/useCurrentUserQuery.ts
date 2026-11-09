import { useQuery } from '@tanstack/react-query';
import { useAccessToken } from '@/shared/hooks/useAccessToken';

import { getCurrentUser } from '../api/auth';

export const authQueryKeys = {
  currentUser: ['auth', 'current-user'] as const,
};

export function useCurrentUserQuery(enabled: boolean) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: [...authQueryKeys.currentUser, accessToken],
    queryFn: ({ signal }) => getCurrentUser(signal),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
  });
}
