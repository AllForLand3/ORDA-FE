import { Button } from '@/components/ui';

import type { TerrainAnalysisPhase } from '../types/terrainAnalysis';

interface CourseTerrainAnalysisPanelProps {
  courseName: string;
  phase: TerrainAnalysisPhase;
  configured: boolean;
  canStart: boolean;
  onStart: () => void;
}

const messages: Record<TerrainAnalysisPhase, { title: string; description: string }> = {
  idle: {
    title: '고도 분석',
    description: '이 코스의 고도를 분석할 수 있어요.',
  },

  requesting: {
    title: '분석을 요청하고 있어요',
    description: '완료까지 시간이 걸릴 수 있어요.',
  },

  running: {
    title: '고도 분석이 진행 중이에요',
    description: '분석 상태를 확인하고 있어요.',
  },

  done: {
    title: '고도 분석이 완료됐어요',
    description: '이 코스의 고도 분석 결과가 준비됐어요.',
  },

  failed: {
    title: '고도 분석에 실패했어요',
    description: '서버에서 분석 실패가 확인됐어요.',
  },

  unknown: {
    title: '분석 결과를 확인하지 못했어요',
    description: '서버에서 분석이 계속되고 있을 수 있어요.',
  },
};

export function CourseTerrainAnalysisPanel({
  courseName,
  phase,
  configured,
  canStart,
  onStart,
}: CourseTerrainAnalysisPanelProps) {
  const message = messages[phase];
  const isBusy = phase === 'requesting' || phase === 'running';
  const isError = phase === 'failed' || phase === 'unknown';

  return (
    <section
      aria-label="코스 고도 분석"
      aria-busy={isBusy}
      className="terrain-analysis insights-panel"
    >
      <header className="insights-panel__heading">
        <div>
          <h2>{courseName}</h2>
          <p>고도 분석</p>
        </div>
      </header>

      <div className="insights-empty">
        <div role={isError ? 'alert' : 'status'}>
          <strong>{configured ? message.title : '분석을 사용할 수 없어요'}</strong>

          <p>{configured ? message.description : '분석 설정을 확인한 뒤 다시 이용해주세요.'}</p>
        </div>

        {phase === 'idle' ? (
          <Button disabled={!configured || !canStart} onClick={onStart} variant="primary">
            고도 분석하기
          </Button>
        ) : isBusy ? (
          <Button disabled variant="primary">
            분석 중…
          </Button>
        ) : null}
      </div>
    </section>
  );
}
