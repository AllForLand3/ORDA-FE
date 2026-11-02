export type TerrainAnalysisStatus = 'REQUESTED' | 'RUNNING' | 'DONE' | 'FAILED';

export type TerrainAnalysisPhase =
  | 'idle'
  | 'checking'
  | 'requesting'
  | 'running'
  | 'done'
  | 'failed'
  | 'unknown'
  | 'blocked'
  | 'conflict'
  | 'auth';

export interface TerrainAnalysisConditions {
  courseId: string;
  revNo: number;
  demId: string;
  sampleIntervalM: number;
}

export interface TerrainAnalysisRequest {
  demId: string;
  revNo: number;
  sampleIntervalM: number;
}

export interface TerrainAnalysisSummary {
  ascentM: number;
  descentM: number;
  maxElevationM: number;
  minElevationM: number;
  sampleCount: number;
  missingCount: number;
}

export interface TerrainAnalysisSample {
  seqNo: number;
  distanceM: number;
  elevationM: number | null;
}

export interface TerrainAnalysisFailure {
  code: string;
  message: string;
}

// 전체 샘플을 제공하는 POST·분석 ID 조회·프로파일 조회용이다.
export interface TerrainAnalysisResponse {
  analysisId: string;
  courseId: string;
  revNo: number;
  demId: string;
  demName: string;
  resolutionM: number;
  sampleIntervalM: number;
  status: TerrainAnalysisStatus;
  analysis: TerrainAnalysisSummary | null;
  samples: TerrainAnalysisSample[];
  completedAt: string | null;
  failure: TerrainAnalysisFailure | null;
}
