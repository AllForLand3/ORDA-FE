import { Button, Tabs } from '@/components/ui';

import { getRouteSearchErrorMessage } from '../api/route-search-errors';
import type { useRouteSearchResultsState } from '../hooks/useRouteSearchResultsState';
import { RouteCandidateCard } from './RouteCandidateCard';

interface RouteSearchResultsPanelProps {
  state: ReturnType<typeof useRouteSearchResultsState>;
}

// 지형 분석·주변 시설은 경로 탐색 결과와 아직 연결되지 않았다. 예시 수치를 보여주지 않는다.
function NotConnectedNotice({ title }: { title: string }) {
  return (
    <div className="route-results-state" role="status">
      <strong>{title} 미연결</strong>
      <p>경로 탐색 결과에 대한 {title} 정보는 아직 제공되지 않습니다.</p>
    </div>
  );
}

function RouteSearchStatus({ state }: Pick<RouteSearchResultsPanelProps, 'state'>) {
  if (state.status === 'loading') {
    return (
      <div className="route-results-state" role="status">
        <strong>경로 후보를 탐색하고 있어요</strong>
        <p>출발·도착 지점 사이의 등산로를 찾는 중입니다.</p>
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div className="route-results-state" role="status">
        <strong>탐색된 경로 후보가 없어요</strong>
        <p>조건을 바꿔 다시 탐색해주세요.</p>
      </div>
    );
  }

  const message = getRouteSearchErrorMessage(state.error);

  return (
    <div className="route-results-state" role="alert">
      <strong>{message.title}</strong>
      <p>{message.description}</p>
      {message.retryable ? (
        <Button onClick={state.retry} size="sm" variant="secondary">
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}

export function RouteSearchResultsPanel({ state }: RouteSearchResultsPanelProps) {
  const comparison = (
    <div aria-busy={state.status === 'loading'} className="route-results-comparison">
      {state.status === 'ready' ? (
        <div className="route-results-cards">
          {state.candidateViews.map((candidate, index) => (
            <RouteCandidateCard
              candidate={candidate}
              index={index}
              key={candidate.id}
              onSelect={() => state.selectCandidate(candidate.id)}
              selected={candidate.id === state.selectedCandidate?.id}
            />
          ))}
        </div>
      ) : (
        <RouteSearchStatus state={state} />
      )}
    </div>
  );

  return (
    <div className="route-results-panel">
      <header className="route-results-panel__intro">
        <h1>경로 탐색 결과</h1>
        <p>
          {state.status === 'ready'
            ? `${state.candidateViews.length}개 경로 후보 · 거리와 예상 시간은 서버 탐색 결과입니다.`
            : '출발·도착 노드 ID로 요청한 경로 탐색 결과입니다.'}
        </p>
      </header>
      <Tabs
        ariaLabel="경로 탐색 결과 정보"
        items={[
          { value: 'compare', label: '코스 비교', content: comparison },
          {
            value: 'terrain',
            label: '지형 분석',
            content: state.tab === 'terrain' ? <NotConnectedNotice title="지형 분석" /> : null,
          },
          {
            value: 'facilities',
            label: '주변 시설',
            content: state.tab === 'facilities' ? <NotConnectedNotice title="주변 시설" /> : null,
          },
        ]}
        onValueChange={state.setTab}
        value={state.tab}
      />
    </div>
  );
}
