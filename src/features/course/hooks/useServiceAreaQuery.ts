import { skipToken, useQuery } from '@tanstack/react-query';

import { getServiceArea } from '../api/mountains';
import { mountainQueryKeys } from './mountainQueryKeys';

export function useServiceAreaQuery(mountainId: string | null) {
  return useQuery({
    queryKey: mountainQueryKeys.serviceArea(mountainId),
    queryFn: mountainId ? () => getServiceArea(mountainId) : skipToken,
  });
}
