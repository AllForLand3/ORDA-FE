import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getTerrainAnalysis, requestTerrainAnalysis } from '../api/terrainAnalysis';

import type {
  TerrainAnalysisConditions,
  TerrainAnalysisPhase,
  TerrainAnalysisResponse,
} from '../types/terrainAnalysis';

// 프론트 대기 정책이다. 실제 분석 시간에 맞춰 조정할 수 있다.
const POLL_INTERVAL_MS = 2_000;
const POST_WAIT_MS = 120_000;
const POLL_WAIT_MS = 120_000;

interface AnalysisUiState {
  scope: string;
  phase: TerrainAnalysisPhase;
  analysisId: string | null;
}

interface AnalysisRun {
  controller: AbortController;
}

interface MutationInput {
  conditions: TerrainAnalysisConditions;
  signal: AbortSignal;
}

export const terrainAnalysisKeys = {
  result: (userId: string | undefined, conditions: TerrainAnalysisConditions | null) =>
    [
      'terrain-analysis',
      'result',
      userId,
      conditions?.courseId,
      conditions?.revNo,
      conditions?.demId,
      conditions?.sampleIntervalM,
    ] as const,
};

function waitForNextPoll(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('요청 대기가 취소되었습니다.', 'AbortError'));
      return;
    }

    const onAbort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);

      reject(new DOMException('요청 대기가 취소되었습니다.', 'AbortError'));
    };

    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function assertMatchingResponse(
  response: TerrainAnalysisResponse,
  conditions: TerrainAnalysisConditions,
): void {
  if (
    response.courseId !== conditions.courseId ||
    response.revNo !== conditions.revNo ||
    response.demId !== conditions.demId ||
    response.sampleIntervalM !== conditions.sampleIntervalM
  ) {
    throw new Error('요청 조건과 다른 분석 응답입니다.');
  }

  if (!/^[1-9]\d*$/.test(response.analysisId)) {
    throw new Error('분석 ID를 확인할 수 없습니다.');
  }

  if (
    response.status !== 'REQUESTED' &&
    response.status !== 'RUNNING' &&
    response.status !== 'DONE' &&
    response.status !== 'FAILED'
  ) {
    throw new Error('알 수 없는 분석 상태입니다.');
  }

  if (
    response.status === 'DONE' &&
    (response.analysis === null ||
      response.completedAt === null ||
      !Array.isArray(response.samples))
  ) {
    throw new Error('완료 결과를 확인할 수 없습니다.');
  }
}

export function useTerrainAnalysis(
  userId: string | undefined,
  conditions: TerrainAnalysisConditions | null,
) {
  const queryClient = useQueryClient();

  const resultKey = terrainAnalysisKeys.result(userId, conditions);
  const scope = JSON.stringify(resultKey);

  const activeRunRef = useRef<AnalysisRun | null>(null);

  const [ui, setUi] = useState<AnalysisUiState>({
    scope: '',
    phase: 'idle',
    analysisId: null,
  });

  // 자동 GET은 하지 않는다.
  // POST와 진행 조회에서 저장한 응답을 구독한다.
  const resultQuery = useQuery<TerrainAnalysisResponse>({
    queryKey: resultKey,
    enabled: false,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const { mutateAsync } = useMutation({
    mutationFn: ({ conditions: target, signal }: MutationInput) =>
      requestTerrainAnalysis(
        target.courseId,
        {
          demId: target.demId,
          revNo: target.revNo,
          sampleIntervalM: target.sampleIntervalM,
        },
        signal,
      ),

    // POST는 자동 재시도하거나 오프라인 큐에 보관하지 않는다.
    retry: false,
    networkMode: 'always',
    gcTime: 0,
  });

  useEffect(() => {
    return () => {
      const run = activeRunRef.current;

      // 먼저 무효화해야 취소된 응답이 화면 상태를 바꾸지 않는다.
      activeRunRef.current = null;
      run?.controller.abort();
    };
  }, [scope]);

  const savedResult = resultQuery.data;

  // 중단한 분석은 조회가 끝났으므로 진행 중으로 복원하지 않는다.
  const restoredPhase: TerrainAnalysisPhase =
    savedResult?.status === 'REQUESTED' || savedResult?.status === 'RUNNING'
      ? 'unknown'
      : savedResult?.status === 'FAILED'
        ? 'failed'
        : 'idle';

  const currentUi: AnalysisUiState =
    ui.scope === scope
      ? ui
      : {
          scope,
          phase: restoredPhase,
          analysisId: savedResult?.analysisId ?? null,
        };

  // 조건 변경을 state에도 기록해 A → B → A에서 과거 ui가 재사용되지 않게 한다.
  // 조건부 갱신이므로 새 scope당 한 번만 실행된다.
  if (ui.scope !== scope) {
    setUi(currentUi);
  }

  const completedResult = savedResult?.status === 'DONE' ? savedResult : null;

  const phase: TerrainAnalysisPhase = completedResult ? 'done' : currentUi.phase;

  const isBusy = phase === 'requesting' || phase === 'running';

  async function start(): Promise<void> {
    if (!userId || !conditions || activeRunRef.current !== null || phase !== 'idle') {
      return;
    }

    const target = { ...conditions };
    const targetKey = terrainAnalysisKeys.result(userId, target);
    const targetScope = JSON.stringify(targetKey);

    const run: AnalysisRun = {
      controller: new AbortController(),
    };

    // React 재렌더링 전에도 연속 클릭을 막도록 동기적으로 잠근다.
    activeRunRef.current = run;

    let analysisId: string | null = null;

    const isCurrentRun = () => activeRunRef.current === run;

    const updatePhase = (nextPhase: TerrainAnalysisPhase) => {
      if (!isCurrentRun()) {
        return;
      }

      setUi({
        scope: targetScope,
        phase: nextPhase,
        analysisId,
      });
    };

    let timeoutId = window.setTimeout(() => {
      run.controller.abort();
    }, POST_WAIT_MS);

    updatePhase('requesting');

    try {
      let response = await mutateAsync({
        conditions: target,
        signal: run.controller.signal,
      });

      if (!isCurrentRun() || run.controller.signal.aborted) {
        return;
      }

      assertMatchingResponse(response, target);
      analysisId = response.analysisId;

      queryClient.setQueryData<TerrainAnalysisResponse>(targetKey, response);

      window.clearTimeout(timeoutId);

      // POST 대기와 별도로 진행 조회의 최대 대기 시간을 시작한다.
      timeoutId = window.setTimeout(() => {
        run.controller.abort();
      }, POLL_WAIT_MS);

      while (response.status === 'REQUESTED' || response.status === 'RUNNING') {
        updatePhase('running');

        // 이전 요청이 완료된 뒤 다음 요청을 예약한다.
        await waitForNextPoll(POLL_INTERVAL_MS, run.controller.signal);

        if (!isCurrentRun()) {
          return;
        }

        const expectedAnalysisId = analysisId;

        response = await queryClient.fetchQuery({
          queryKey: targetKey,
          staleTime: 0,
          retry: false,
          networkMode: 'always',

          queryFn: async ({ signal }) => {
            const combinedSignal = AbortSignal.any([signal, run.controller.signal]);

            const next = await getTerrainAnalysis(expectedAnalysisId, combinedSignal);

            if (!isCurrentRun() || combinedSignal.aborted) {
              throw new DOMException('이전 요청입니다.', 'AbortError');
            }

            assertMatchingResponse(next, target);

            if (next.analysisId !== expectedAnalysisId) {
              throw new Error('다른 분석 ID의 응답입니다.');
            }

            return next;
          },
        });
      }

      if (!isCurrentRun() || run.controller.signal.aborted) {
        return;
      }

      if (response.status === 'DONE') {
        updatePhase('done');
      } else {
        updatePhase('failed');
      }
    } catch {
      // 조건 변경·화면 이탈로 취소된 요청은 새 화면에 반영하지 않는다.
      if (!isCurrentRun()) {
        return;
      }

      // 통신 실패나 시간 초과를 서버의 분석 실패로 단정하지 않는다.
      updatePhase('unknown');
    } finally {
      window.clearTimeout(timeoutId);

      if (isCurrentRun()) {
        activeRunRef.current = null;
      }
    }
  }

  return {
    phase,
    isBusy,
    canStart: Boolean(userId && conditions) && phase === 'idle',
    result: completedResult,
    analysisId: savedResult?.analysisId ?? currentUi.analysisId,
    failure: savedResult?.status === 'FAILED' ? savedResult.failure : null,
    start,
  };
}
