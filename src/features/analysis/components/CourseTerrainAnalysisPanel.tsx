import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import type { TerrainAnalysisPhase, TerrainAnalysisResponse } from '../types/terrainAnalysis';

const ElevationProfileChart = lazy(() =>
  import('./ElevationProfileChart').then((module) => ({
    default: module.ElevationProfileChart,
  })),
);

interface CourseTerrainAnalysisPanelProps {
  courseName: string;
  phase: TerrainAnalysisPhase;
  result: TerrainAnalysisResponse | null;
  configured: boolean;
  message: string | null;

  canStart: boolean;
  canRetry: boolean;
  canCheck: boolean;

  onStart: () => void;
  onRetry: () => void;
  onCheck: () => void;
  onRefreshCourse: () => void;
}

const messages: Record<TerrainAnalysisPhase, { title: string; description: string }> = {
  idle: {
    title: '고도 분석',
    description: '이 코스의 고도를 분석할 수 있어요.',
  },

  checking: {
    title: '분석 결과를 확인하고 있어요',
    description: '현재 조건의 분석 상태를 확인하고 있어요.',
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
    description: '다시 시도할 수 있어요.',
  },

  unknown: {
    title: '분석 결과를 확인하지 못했어요',
    description: '서버에서 분석이 계속되고 있을 수 있어요.',
  },

  blocked: {
    title: '분석을 사용할 수 없어요',
    description: '코스 접근 권한과 분석 조건을 확인해주세요.',
  },

  conflict: {
    title: '코스가 변경됐어요',
    description: '최신 코스 정보를 다시 불러와주세요.',
  },

  auth: {
    title: '로그인이 필요해요',
    description: '다시 로그인한 뒤 이용해주세요.',
  },
};

/** 분석 단계와 사용 가능한 사용자 동작을 표시하며 API 호출은 상위 훅에 맡긴다. */
export function CourseTerrainAnalysisPanel({
  courseName,
  phase,
  result,
  configured,
  message,
  canStart,
  canRetry,
  canCheck,
  onStart,
  onRetry,
  onCheck,
  onRefreshCourse,
}: CourseTerrainAnalysisPanelProps) {
  const completedResult =
    configured && phase === 'done' && result?.status === 'DONE' && result.analysis !== null
      ? result
      : null;
  const missingCompletedResult = configured && phase === 'done' && completedResult === null;
  const text = missingCompletedResult
    ? {
        title: '분석 결과를 표시할 수 없어요',
        description: '현재 조건에 맞는 완료 결과를 확인하지 못했어요.',
      }
    : messages[phase];

  const isBusy = phase === 'checking' || phase === 'requesting' || phase === 'running';

  const isError =
    missingCompletedResult ||
    phase === 'failed' ||
    phase === 'unknown' ||
    phase === 'blocked' ||
    phase === 'conflict' ||
    phase === 'auth';

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

      {completedResult ? (
        <section aria-label="고도 분석 결과" className="terrain-analysis__result">
          <p role="status">고도 분석이 완료됐어요</p>

          <Suspense
            fallback={
              <p role="status" className="insights-note">
                고도 그래프를 준비하고 있어요.
              </p>
            }
          >
            <ElevationProfileChart samples={completedResult.samples} />
          </Suspense>

          <dl className="terrain-analysis__criteria" aria-label="분석 기준">
            <div>
              <dt>DEM</dt>
              <dd>{completedResult.demName}</dd>
            </div>
            <div>
              <dt>자료 명목 해상도</dt>
              <dd>{completedResult.resolutionM} m</dd>
            </div>
            <div>
              <dt>샘플 간격</dt>
              <dd>{completedResult.sampleIntervalM} m</dd>
            </div>
          </dl>
        </section>
      ) : (
        <div className="insights-empty">
          <div role={isError ? 'alert' : 'status'}>
            <strong>{configured ? text.title : '분석을 사용할 수 없어요'}</strong>

            <p>
              {configured
                ? missingCompletedResult
                  ? text.description
                  : (message ?? text.description)
                : '분석 설정을 확인한 뒤 다시 이용해주세요.'}
            </p>
          </div>

          {configured && phase === 'idle' ? (
            <Button disabled={!canStart} onClick={onStart}>
              고도 분석하기
            </Button>
          ) : null}

          {configured && isBusy ? (
            <Button disabled>{phase === 'checking' ? '확인 중…' : '분석 중…'}</Button>
          ) : null}

          {configured && phase === 'failed' ? (
            <Button disabled={!canRetry} onClick={onRetry}>
              다시 시도
            </Button>
          ) : null}

          {configured && phase === 'unknown' ? (
            <Button disabled={!canCheck} onClick={onCheck} variant="secondary">
              결과 다시 확인
            </Button>
          ) : null}

          {configured && phase === 'conflict' ? (
            <Button onClick={onRefreshCourse} variant="secondary">
              최신 코스 불러오기
            </Button>
          ) : null}

          {phase === 'auth' ? <Link to="/login">로그인하기</Link> : null}
        </div>
      )}
    </section>
  );
}
