import { useSearchParams } from 'react-router-dom';

import { MOCK_ROUTE_CANDIDATES } from '../mocks/route-results';

export const RESULT_PREVIEW_STATES = [
  { value: 'ready', label: '예시 코스' },
  { value: 'loading', label: '로딩 데모' },
  { value: 'empty', label: '결과 없음' },
  { value: 'error', label: '오류 데모' },
] as const;

export function useRouteResultsState() {
  const [params, setParams] = useSearchParams();
  const previewState =
    RESULT_PREVIEW_STATES.find((item) => item.value === params.get('preview'))?.value ?? 'ready';
  const tabParam = params.get('tab');
  const tab = tabParam === 'terrain' || tabParam === 'facilities' ? tabParam : 'compare';
  const selectedCandidate =
    MOCK_ROUTE_CANDIDATES.find((item) => item.id === params.get('candidate')) ??
    MOCK_ROUTE_CANDIDATES[0];
  const setupParams = new URLSearchParams(params);
  for (const key of ['preview', 'tab', 'candidate']) setupParams.delete(key);
  setupParams.set('step', 'conditions');

  function update(key: string, value: string, replace = false) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(key, value);
        return next;
      },
      { replace },
    );
  }

  return {
    previewState,
    tab,
    selectedCandidate,
    setupHref: `/routes/setup?${setupParams}`,
    setPreviewState: (value: string) => {
      if (RESULT_PREVIEW_STATES.some((item) => item.value === value)) update('preview', value);
    },
    setTab: (value: string) => {
      if (value === 'compare' || value === 'terrain' || value === 'facilities')
        update('tab', value);
    },
    selectCandidate: (id: string) => {
      if (MOCK_ROUTE_CANDIDATES.some((item) => item.id === id)) update('candidate', id, true);
    },
  };
}
