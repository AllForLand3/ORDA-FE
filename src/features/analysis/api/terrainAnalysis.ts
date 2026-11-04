import { isAxiosError } from 'axios';

import { apiClient } from '@/lib/axios';

import type {
  TerrainAnalysisConditions,
  TerrainAnalysisRequest,
  TerrainAnalysisResponse,
} from '../types/terrainAnalysis';

interface ErrorBody {
  code: string;
  message: string;
}

export interface TerrainApiProblem {
  code: string | null;
  status: number | null;
}

/** 비정형 오류도 처리할 수 있도록 API 코드와 HTTP 상태만 추출한다. */
export function getTerrainApiProblem(error: unknown): TerrainApiProblem {
  if (!isAxiosError<ErrorBody>(error)) {
    return {
      code: null,
      status: null,
    };
  }

  return {
    code: typeof error.response?.data?.code === 'string' ? error.response.data.code : null,
    status: error.response?.status ?? null,
  };
}

/** 실패 Location의 분석 ID만 추출하며 외부 URL을 요청 주소로 사용하지 않는다. */
export function getFailureAnalysisId(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null;
  }

  const location = error.response?.headers?.location;

  if (typeof location !== 'string') {
    return null;
  }

  try {
    const url = new URL(location, window.location.origin);

    if (url.search || url.hash) {
      return null;
    }

    const match = url.pathname.match(/\/api\/terrain-analyses\/([1-9]\d*)\/?$/);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** 현재 코스 버전과 DEM·간격으로 분석 실행 또는 동일 조건 재시도를 요청한다. */
export async function requestTerrainAnalysis(
  courseId: string,
  body: TerrainAnalysisRequest,
  signal?: AbortSignal,
): Promise<TerrainAnalysisResponse> {
  const response = await apiClient.post<TerrainAnalysisResponse>(
    `/courses/${encodeURIComponent(courseId)}/terrain-analyses`,
    body,
    { signal },
  );

  return response.data;
}

/** 분석 ID에 해당하는 상태·통계·전체 샘플을 조회한다. */
export async function getTerrainAnalysis(
  analysisId: string,
  signal?: AbortSignal,
): Promise<TerrainAnalysisResponse> {
  const response = await apiClient.get<TerrainAnalysisResponse>(
    `/terrain-analyses/${encodeURIComponent(analysisId)}`,
    { signal },
  );

  return response.data;
}

/** 분석 ID를 모를 때 현재 코스·버전·DEM·간격에 해당하는 결과를 조회한다. */
export async function getCurrentTerrainProfile(
  conditions: TerrainAnalysisConditions,
  signal?: AbortSignal,
): Promise<TerrainAnalysisResponse> {
  const response = await apiClient.get<TerrainAnalysisResponse>(
    `/courses/${encodeURIComponent(conditions.courseId)}/elevation-profile`,
    {
      params: {
        demId: conditions.demId,
        revNo: conditions.revNo,
        sampleIntervalM: conditions.sampleIntervalM,
      },
      signal,
    },
  );

  return response.data;
}
