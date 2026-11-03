import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { getFacility } from '../api/nearby';

export const facilityQueryKeys = {
  detail: (facilityId: string) => ['analysis', 'facility', facilityId] as const,
};

/** 시설 상세(I-04)에서 출처 제공기관을 조회한다. 상세를 펼쳤을 때만 요청한다. */
export function useFacilitySource(facilityId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: facilityQueryKeys.detail(facilityId ?? ''),
    queryFn: async () => {
      if (facilityId === null) {
        throw new Error('조회할 시설이 없습니다.');
      }
      const facility = await getFacility(facilityId);
      return facility.source.provider;
    },
    enabled: enabled && facilityId !== null,
    // 출처는 자주 바뀌지 않아 같은 시설을 다시 펼쳐도 다시 요청하지 않는다.
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response && error.response.status < 500) &&
      failureCount < 1,
  });
}
