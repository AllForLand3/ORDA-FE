import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import type { TerrainAnalysisPhase, TerrainAnalysisResponse } from '../types/terrainAnalysis';

const metricFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1,
});

/** BE 통계의 실제 0과 미제공을 구분하고 표시 단계에서만 반올림한다. */
function formatElevationMetric(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '미제공';
  }

  return `${metricFormatter.format(value)} m`;
}

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
  const summary = completedResult?.analysis;
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

          <dl aria-label="고도 분석 통계" className="terrain-analysis__metrics">
            {[
              { label: '누적 상승', value: summary?.ascentM },
              { label: '누적 하강', value: summary?.descentM },
              { label: '최고 고도', value: summary?.maxElevationM },
              { label: '최저 고도', value: summary?.minElevationM },
            ].map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{formatElevationMetric(metric.value)}</dd>
              </div>
            ))}
          </dl>

          <Suspense
            fallback={
              <p role="status" className="insights-note">
                고도 그래프를 준비하고 있어요.
              </p>
            }
          >
            <ElevationProfileChart samples={completedResult.samples} />
          </Suspense>

          <p className="insights-note">
            {typeof summary?.sampleCount === 'number' && typeof summary?.missingCount === 'number'
              ? `전체 ${summary.sampleCount.toLocaleString('ko-KR')}개 중 고도 미제공 ${summary.missingCount.toLocaleString('ko-KR')}개`
              : '샘플 수와 결측 개수 정보가 미제공 상태입니다.'}
          </p>

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
          <p className="insights-disclaimer">
            샘플 간격은 코스에서 고도를 추출하는 간격입니다. 자료의 명목 해상도보다 좁게 설정해도
            원천 고도 자료의 해상도가 높아지는 것은 아닙니다.
          </p>
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
