import { useLayoutEffect, useRef } from 'react';

import { getAccessToken } from '@/lib/accessToken';

/** 화면을 떠났거나 계정이 바뀐 뒤에는 이전 요청의 결과를 화면·캐시에 반영하지 않는다. */
export function useCourseSessionGuard(accessToken: string | null) {
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return () => mounted.current && accessToken !== null && getAccessToken() === accessToken;
}
