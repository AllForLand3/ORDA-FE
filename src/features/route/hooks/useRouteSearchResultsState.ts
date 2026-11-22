import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { RoutePriority } from '../mocks/route-setup';
import type { RouteSearchCandidateView } from '../types/route-candidate-view';
import type {
  RouteSearchCandidate,
  RouteSearchPriorityCondition,
  RouteSearchRequest,
} from '../types/route-search';
import { useRouteSearch } from './useRouteSearch';

const PRIORITY_CONDITION_LABELS: Readonly<Record<string, string>> = {
  DIST_FIRST: '거리 우선',
  LESS_STAIR: '계단 적게',
};

const PRIORITY_CONDITION_NAMES: Readonly<Record<string, string>> = {
  DIST_FIRST: '거리 우선 경로',
  LESS_STAIR: '계단 적은 경로',
};

// 코스 탐색 설정 화면의 탐색 기준 중 서버 탐색에 반영되는 것만 옮긴다.
// 완만한 경사(gentle-slope)는 구간 고도 값이 없어 아직 보내지 않는다.
const PRIORITY_CONDITIONS: Readonly<Partial<Record<RoutePriority, RouteSearchPriorityCondition>>> =
  {
    distance: 'DIST_FIRST',
    'fewer-stairs': 'LESS_STAIR',
  };

function readPriorityConditions(value: string | null): RouteSearchPriorityCondition[] {
  const conditions = new Set<RouteSearchPriorityCondition>();
  for (const token of (value ?? '').split(',')) {
    const condition = PRIORITY_CONDITIONS[token as RoutePriority];
    if (condition) conditions.add(condition);
  }
  return [...conditions];
}

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
  const priorities = params.get('priorities');

  return useMemo(() => {
    if (!mountainId || !startNodeId || !endNodeId) return null;
    const priorityConditions = readPriorityConditions(priorities);
    // 반영할 기준이 없으면 기존 요청 그대로 보내 서버 기본값(거리 우선)을 쓴다.
    return priorityConditions.length
      ? { mountainId, startNodeId, endNodeId, priorityConditions }
      : { mountainId, startNodeId, endNodeId };
  }, [endNodeId, mountainId, priorities, startNodeId]);
}

function toCandidateView(candidate: RouteSearchCandidate): RouteSearchCandidateView {
  const priorityLabel =
    PRIORITY_CONDITION_LABELS[candidate.priorityCondition] ?? candidate.priorityCondition;

  return {
    id: `rank-${candidate.rank}`,
    source: 'api',
    rank: candidate.rank,
    name: PRIORITY_CONDITION_NAMES[candidate.priorityCondition] ?? `${priorityLabel} 경로`,
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
  // 서버는 기준이 달라도 같은 경로면 앞 순위 후보 하나만 돌려준다.
  const requestedConditions = request.priorityConditions ?? [];
  const mergedConditionLabels =
    status === 'ready'
      ? requestedConditions
          .filter((condition) => !candidates.some((item) => item.priorityCondition === condition))
          .map((condition) => PRIORITY_CONDITION_LABELS[condition] ?? condition)
      : [];
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
    mergedConditionLabels,
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
