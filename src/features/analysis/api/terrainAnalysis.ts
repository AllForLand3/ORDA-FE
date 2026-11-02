import { apiClient } from '@/lib/axios';

import type { TerrainAnalysisRequest, TerrainAnalysisResponse } from '../types/terrainAnalysis';

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
