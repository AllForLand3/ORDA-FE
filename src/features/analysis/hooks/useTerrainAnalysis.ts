import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getCurrentTerrainProfile,
  getFailureAnalysisId,
  getTerrainAnalysis,
  getTerrainApiProblem,
  requestTerrainAnalysis,
} from '../api/terrainAnalysis';

import type {
  TerrainAnalysisConditions,
  TerrainAnalysisPhase,
  TerrainAnalysisResponse,
} from '../types/terrainAnalysis';

const POLL_INTERVAL_MS = 2_000;
const REQUEST_WAIT_MS = 120_000;
const POLL_WAIT_MS = 120_000;

type Operation = 'initial' | 'start' | 'retry' | 'check';

interface AnalysisUiState {
  scope: string;
  phase: TerrainAnalysisPhase;
  analysisId: string | null;
  message: string | null;
}

interface AnalysisRun {
  controller: AbortController;
}

interface MutationInput {
  conditions: TerrainAnalysisConditions;
  signal: AbortSignal;
}

interface BlockingProblem {
  phase: 'auth' | 'blocked' | 'conflict';
  message: string;
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

function getBlockingProblem(error: unknown): BlockingProblem | null {
  const { code, status } = getTerrainApiProblem(error);

  if (code === 'UNAUTHORIZED' || status === 401) {
    return {
      phase: 'auth',
      message: '로그인이 만료됐어요. 다시 로그인해주세요.',
    };
  }

  if (code === 'CONFLICT') {
    return {
      phase: 'conflict',
      message: '코스가 변경됐어요. 최신 코스 정보를 불러와주세요.',
    };
  }

  if (code === 'COURSE_NOT_FOUND') {
    return {
      phase: 'blocked',
      message: '삭제되었거나 접근할 수 없는 코스입니다.',
    };
  }

  if (code === 'FORBIDDEN' || status === 403) {
    return {
      phase: 'blocked',
      message: '이 코스에 접근할 수 없어요. 권한과 접속 환경을 확인해주세요.',
    };
  }

  if (
    code === 'DEM_NOT_FOUND' ||
    code === 'DEM_UNAVAILABLE' ||
    code === 'INVALID_REQUEST' ||
    code === 'ANALYSIS_INVALID_SAMPLE_INTERVAL' ||
    code === 'ANALYSIS_SAMPLE_LIMIT_EXCEEDED'
  ) {
    return {
      phase: 'blocked',
      message: '분석 조건을 사용할 수 없어요. 코스와 고도 데이터 설정을 확인해주세요.',
    };
  }

  return null;
}

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
  expectedAnalysisId?: string,
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

  if (expectedAnalysisId !== undefined && response.analysisId !== expectedAnalysisId) {
    throw new Error('다른 분석 ID의 응답입니다.');
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
    (response.analysis == null || response.completedAt == null || !Array.isArray(response.samples))
  ) {
    throw new Error('완료 결과를 확인할 수 없습니다.');
  }
}

export function useTerrainAnalysis(
  userId: string | undefined,
  conditions: TerrainAnalysisConditions | null,
) {
  const queryClient = useQueryClient();

  const courseId = conditions?.courseId;
  const revNo = conditions?.revNo;
  const demId = conditions?.demId;
  const sampleIntervalM = conditions?.sampleIntervalM;

  // 페이지가 매번 새 객체를 만들어도 값이 같으면 동일한 조건을 유지한다.
  const target = useMemo<TerrainAnalysisConditions | null>(() => {
    if (
      courseId === undefined ||
      revNo === undefined ||
      demId === undefined ||
      sampleIntervalM === undefined
    ) {
      return null;
    }

    return {
      courseId,
      revNo,
      demId,
      sampleIntervalM,
    };
  }, [courseId, revNo, demId, sampleIntervalM]);

  const resultKey = useMemo(() => terrainAnalysisKeys.result(userId, target), [userId, target]);

  const scope = JSON.stringify(resultKey);
  const activeRunRef = useRef<AnalysisRun | null>(null);

  const [ui, setUi] = useState<AnalysisUiState>({
    scope: '',
    phase: 'idle',
    analysisId: null,
    message: null,
  });

  const resultQuery = useQuery<TerrainAnalysisResponse>({
    queryKey: resultKey,
    enabled: false,
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const { mutateAsync } = useMutation({
    mutationFn: ({ conditions: requestTarget, signal }: MutationInput) =>
      requestTerrainAnalysis(
        requestTarget.courseId,
        {
          demId: requestTarget.demId,
          revNo: requestTarget.revNo,
          sampleIntervalM: requestTarget.sampleIntervalM,
        },
        signal,
      ),
    retry: false,
    networkMode: 'always',
    gcTime: 0,
  });

  const runOperation = useCallback(
    async (operation: Operation, knownAnalysisId: string | null = null): Promise<void> => {
      if (!userId || !target || activeRunRef.current !== null) {
        return;
      }

      const run: AnalysisRun = {
        controller: new AbortController(),
      };

      activeRunRef.current = run;

      let analysisId = knownAnalysisId;
      let readingProfile = false;
      let timeoutId: number | undefined;

      const previousResult = queryClient.getQueryData<TerrainAnalysisResponse>(resultKey);

      // 이전 요청 이력이 있으면 404라도 미분석으로 단정하지 않는다.
      const canShowInitialIdle = operation === 'initial' && previousResult === undefined;

      const isCurrentRun = () => activeRunRef.current === run;

      const updateUi = (phase: TerrainAnalysisPhase, message: string | null = null) => {
        if (!isCurrentRun()) {
          return;
        }

        setUi({
          scope,
          phase,
          analysisId,
          message,
        });
      };

      const startDeadline = (milliseconds: number) => {
        window.clearTimeout(timeoutId);

        // 이전 단계가 시간 초과여도 결과 확인을 위한 새 대기를 시작한다.
        run.controller = new AbortController();

        timeoutId = window.setTimeout(() => {
          run.controller.abort();
        }, milliseconds);
      };

      const readResult = async (id: string | null): Promise<TerrainAnalysisResponse> => {
        readingProfile = id === null;

        return queryClient.fetchQuery({
          queryKey: resultKey,
          staleTime: 0,
          retry: false,
          networkMode: 'always',

          queryFn: async ({ signal }) => {
            const combinedSignal = AbortSignal.any([signal, run.controller.signal]);

            const response = id
              ? await getTerrainAnalysis(id, combinedSignal)
              : await getCurrentTerrainProfile(target, combinedSignal);

            if (!isCurrentRun() || combinedSignal.aborted) {
              throw new DOMException('이전 요청입니다.', 'AbortError');
            }

            assertMatchingResponse(response, target, id ?? undefined);

            return response;
          },
        });
      };

      try {
        startDeadline(REQUEST_WAIT_MS);

        let response: TerrainAnalysisResponse;

        if (operation === 'start' || operation === 'retry') {
          updateUi('requesting');

          try {
            response = await mutateAsync({
              conditions: target,
              signal: run.controller.signal,
            });
          } catch (error) {
            if (!isCurrentRun()) {
              return;
            }

            // 인증·접근·입력·버전 문제는 분석 실패로 표시하지 않는다.
            if (getBlockingProblem(error)) {
              throw error;
            }

            // Location은 ID만 추출한다. URL 자체를 따라가지 않는다.
            analysisId = getFailureAnalysisId(error) ?? analysisId;

            // 응답 유실·시간 초과 후 POST를 반복하지 않고 GET으로 확인한다.
            startDeadline(REQUEST_WAIT_MS);
            updateUi('checking');

            response = await readResult(analysisId);
          }

          if (!isCurrentRun() || run.controller.signal.aborted) {
            return;
          }

          assertMatchingResponse(response, target);
          queryClient.setQueryData(resultKey, response);
        } else {
          updateUi('checking');
          response = await readResult(analysisId);
        }

        if (!isCurrentRun() || run.controller.signal.aborted) {
          return;
        }

        analysisId = response.analysisId;

        startDeadline(POLL_WAIT_MS);

        while (response.status === 'REQUESTED' || response.status === 'RUNNING') {
          updateUi('running');

          await waitForNextPoll(POLL_INTERVAL_MS, run.controller.signal);

          if (!isCurrentRun()) {
            return;
          }

          response = await readResult(analysisId);
        }

        if (!isCurrentRun() || run.controller.signal.aborted) {
          return;
        }

        if (response.status === 'DONE') {
          updateUi('done');
        } else {
          updateUi(
            'failed',
            response.failure?.message ?? '고도 분석에 실패했어요. 다시 시도할 수 있어요.',
          );
        }
      } catch (error) {
        if (!isCurrentRun()) {
          return;
        }

        const blocking = getBlockingProblem(error);

        if (blocking) {
          updateUi(blocking.phase, blocking.message);
          return;
        }

        const problem = getTerrainApiProblem(error);

        if (canShowInitialIdle && readingProfile && problem.code === 'RESOURCE_NOT_FOUND') {
          updateUi('idle');
          return;
        }

        updateUi(
          'unknown',
          problem.code === 'RESOURCE_NOT_FOUND'
            ? '해당 조건의 결과를 찾지 못했어요. 분석 완료 여부를 확인할 수 없어요.'
            : '결과를 확인하지 못했어요. 서버에서 분석이 계속되고 있을 수 있어요.',
        );
      } finally {
        window.clearTimeout(timeoutId);

        if (isCurrentRun()) {
          activeRunRef.current = null;
        }
      }
    },
    [userId, target, resultKey, scope, queryClient, mutateAsync],
  );

  // 최초 진입·조건 변경 시에는 GET만 실행한다.
  // POST는 사용자 동작으로만 실행한다.
  useEffect(() => {
    if (!userId || !target) {
      return;
    }

    void runOperation('initial');

    return () => {
      const run = activeRunRef.current;
      activeRunRef.current = null;
      run?.controller.abort();

      // 이전 fetchQuery가 같은 조건의 새 조회에 섞이지 않게 한다.
      void queryClient.cancelQueries({
        queryKey: resultKey,
        exact: true,
      });
    };
  }, [userId, target, runOperation, queryClient, resultKey]);

  const currentUi: AnalysisUiState =
    ui.scope === scope
      ? ui
      : {
          scope,
          phase: userId && target ? 'checking' : 'idle',
          analysisId: null,
          message: null,
        };

  if (ui.scope !== scope) {
    setUi(currentUi);
  }

  const phase = currentUi.phase;

  const isBusy = phase === 'checking' || phase === 'requesting' || phase === 'running';

  const configured = Boolean(userId && target);

  const completedResult =
    phase === 'done' && resultQuery.data?.status === 'DONE' ? resultQuery.data : null;

  return {
    phase,
    isBusy,
    message: currentUi.message,
    result: completedResult,
    analysisId: currentUi.analysisId,

    canStart: configured && phase === 'idle',
    canRetry: configured && phase === 'failed',
    canCheck: configured && phase === 'unknown',

    start: () => {
      if (phase === 'idle') {
        return runOperation('start');
      }

      return Promise.resolve();
    },

    retry: () => {
      if (phase === 'failed') {
        return runOperation('retry', currentUi.analysisId);
      }

      return Promise.resolve();
    },

    check: () => {
      if (phase === 'unknown') {
        return runOperation('check', currentUi.analysisId);
      }

      return Promise.resolve();
    },
  };
}
