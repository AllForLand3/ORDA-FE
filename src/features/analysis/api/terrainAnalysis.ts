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
