import { useState } from 'react';

import { Button, Dialog, Tabs } from '@/components/ui';

import type { useRouteResultsState } from '../hooks/useRouteResultsState';
import { MOCK_ROUTE_CANDIDATES } from '../mocks/route-results';
import type { MockRouteCandidate } from '../mocks/route-results';
import { RouteCandidateCard } from './RouteCandidateCard';
import { RouteEditDialog } from './RouteEditDialog';

interface RouteResultsPanelProps {
  state: ReturnType<typeof useRouteResultsState>;
}

export function RouteResultsPanel({ state }: RouteResultsPanelProps) {
  const [editingCandidate, setEditingCandidate] = useState<MockRouteCandidate | null>(null);
  const [exportingCandidate, setExportingCandidate] = useState<MockRouteCandidate | null>(null);
  const comparison = (
    <div aria-busy={state.previewState === 'loading'} className="route-results-comparison">
      {state.previewState === 'ready' ? (
        <div className="route-results-cards">
          {MOCK_ROUTE_CANDIDATES.map((candidate, index) => (
            <RouteCandidateCard
              candidate={candidate}
              index={index}
              key={candidate.id}
              onEdit={() => setEditingCandidate(candidate)}
              onExport={() => setExportingCandidate(candidate)}
              onSelect={() => state.selectCandidate(candidate.id)}
              selected={candidate.id === state.selectedCandidate.id}
            />
          ))}
        </div>
      ) : (
        <div
          className="route-results-state"
          role={state.previewState === 'error' ? 'alert' : 'status'}
        >
          <strong>
            {state.previewState === 'loading'
              ? '예시 코스를 불러오는 모습이에요'
              : state.previewState === 'empty'
                ? '표시할 코스가 없어요'
                : '코스를 표시하지 못했어요'}
          </strong>
          <p>
            {state.previewState === 'loading'
              ? '로딩 UI 데모입니다. 실제 서버 요청은 진행되지 않습니다.'
              : state.previewState === 'empty'
                ? '결과 없음 UI 데모입니다. 조건을 바꿔 탐색하는 화면으로 돌아갈 수 있어요.'
                : '오류 UI 데모입니다. 실제 서버 오류가 발생한 것은 아닙니다.'}
          </p>
          <Button onClick={() => state.setPreviewState('ready')} size="sm" variant="secondary">
            예시 코스로 돌아가기
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="route-results-panel">
      <header className="route-results-panel__intro">
        <h1>경로 분석 결과</h1>
        <p>
          {state.previewState === 'ready'
            ? '3개 코스 · 모든 지표는 예시 데이터입니다.'
            : '실제 탐색과 무관한 화면 상태 데모입니다.'}
        </p>
      </header>
      <Tabs
        ariaLabel="코스 결과 정보"
        items={[
          { value: 'compare', label: '코스 비교', content: comparison },
          {
            value: 'terrain',
            label: '지형 분석',
            content: (
              <div className="route-results-state" role="status">
                <strong>분석 미제공</strong>
                <p>
                  실제 고도·경사 자료가 없어 분석 결과를 표시할 수 없어요. 코스 카드의 숫자는 UI
                  예시입니다.
                </p>
              </div>
            ),
          },
          {
            value: 'facilities',
            label: '주변 시설',
            content: (
              <div className="route-results-state" role="status">
                <strong>시설 정보 미제공</strong>
                <p>
                  실제 시설 위치와 목록은 연결되지 않았어요. 예시 시설 수로 실제 시설의 유무를
                  판단할 수 없습니다.
                </p>
              </div>
            ),
          },
        ]}
        onValueChange={state.setTab}
        value={state.tab}
      />
      {editingCandidate ? (
        <RouteEditDialog candidate={editingCandidate} onClose={() => setEditingCandidate(null)} />
      ) : null}
      {exportingCandidate ? (
        <Dialog
          description={`${exportingCandidate.name}는 예시 코스입니다. 실제 경로 파일이 없어 내보낼 수 없어요.`}
          footer={
            <Button onClick={() => setExportingCandidate(null)} variant="secondary">
              닫기
            </Button>
          }
          onOpenChange={(open) => {
            if (!open) setExportingCandidate(null);
          }}
          open
          title="내보내기 준비 중"
        >
          <Button disabled fullWidth>
            파일 내보내기 미연결
          </Button>
        </Dialog>
      ) : null}
    </div>
  );
}
