import { skipToken, useQuery } from '@tanstack/react-query';

import { getMountain } from '../api/mountains';
import { isValidMountainId } from '../utils/mountainId';
import { mountainQueryKeys } from './mountainQueryKeys';

export function useMountainDetailQuery(mountainId: string | null) {
  return useQuery({
    queryKey: mountainQueryKeys.detail(mountainId),
    queryFn: isValidMountainId(mountainId) ? () => getMountain(mountainId) : skipToken,
    retry: false,
  });
}
