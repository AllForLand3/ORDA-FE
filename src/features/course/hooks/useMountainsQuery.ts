import { useQuery } from '@tanstack/react-query';

import { getMountains } from '../api/mountains';
import type { MountainSearchParams } from '../types/mountain';
import { mountainQueryKeys } from './mountainQueryKeys';

export function useMountainsQuery(params: MountainSearchParams = {}) {
  return useQuery({
    queryKey: mountainQueryKeys.list(params),
    queryFn: () => getMountains(params),
  });
}
