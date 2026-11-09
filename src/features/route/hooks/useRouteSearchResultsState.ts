import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { RouteSearchCandidateView } from '../types/route-candidate-view';
import type { RouteSearchCandidate, RouteSearchRequest } from '../types/route-search';
import { useRouteSearch } from './useRouteSearch';

const PRIORITY_CONDITION_LABELS: Readonly<Record<string, string>> = {
  DIST_FIRST: '거리 우선',
};

function readId(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// 세 ID 파라미터가 모두 있을 때만 실제 탐색 요청을 만든다.
// 코스 탐색 설정 화면이 스냅 API로 얻은 노드 ID를 이 파라미터로 넘긴다.
export function useRouteSearchRequest(): RouteSearchRequest | null {
  const [params] = useSearchParams();
  const mountainId = readId(params.get('mountainId'));
  const startNodeId = readId(params.get('startNodeId'));
  const endNodeId = readId(params.get('endNodeId'));

  return useMemo(
    () => (mountainId && startNodeId && endNodeId ? { mountainId, startNodeId, endNodeId } : null),
    [endNodeId, mountainId, startNodeId],
  );
}

function toCandidateView(candidate: RouteSearchCandidate): RouteSearchCandidateView {
  const priorityLabel =
    PRIORITY_CONDITION_LABELS[candidate.priorityCondition] ?? candidate.priorityCondition;

  return {
    id: `rank-${candidate.rank}`,
    source: 'api',
    rank: candidate.rank,
    name: `${priorityLabel} 경로`,
    priorityLabel,
    distanceM: candidate.lengthM,
    durationMinutes: candidate.estTimeMin,
  };
}

export function useRouteSearchResultsState(request: RouteSearchRequest) {
  const [params, setParams] = useSearchParams();
  const query = useRouteSearch(request);
  // 오류 상태에서는 이전 성공 결과가 남아 있어도 선형과 카드를 표시하지 않는다.
  const candidates = useMemo(
    () => (query.isSuccess ? query.data.candidates : []),
    [query.data, query.isSuccess],
  );
  const candidateViews = useMemo(() => candidates.map(toCandidateView), [candidates]);
  const status =
    query.isFetching && !query.isSuccess
      ? 'loading'
      : query.isError
        ? 'error'
        : query.isSuccess
          ? candidates.length
            ? 'ready'
            : 'empty'
          : 'loading';
  const tabParam = params.get('tab');
  const tab = tabParam === 'terrain' || tabParam === 'facilities' ? tabParam : 'compare';
  const selectedCandidate =
    candidateViews.find((item) => item.id === params.get('candidate')) ?? candidateViews[0] ?? null;
  const setupParams = new URLSearchParams(params);
  for (const key of ['preview', 'tab', 'candidate', 'mountainId', 'startNodeId', 'endNodeId']) {
    setupParams.delete(key);
  }
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
    request,
    status,
    error: query.error,
    candidates,
    candidateViews,
    selectedCandidate,
    tab,
    setupHref: `/routes/setup?${setupParams}`,
    retry: () => {
      void query.refetch();
    },
    setTab: (value: string) => {
      if (value === 'compare' || value === 'terrain' || value === 'facilities')
        update('tab', value);
    },
    selectCandidate: (id: string) => {
      if (candidateViews.some((item) => item.id === id)) update('candidate', id, true);
    },
  };
}
