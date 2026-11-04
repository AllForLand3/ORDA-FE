export interface TerrainAnalysisConfig {
  demId: string;
  sampleIntervalM: number;
}

/** DEM ID와 BE가 허용하는 샘플 간격을 검증하며 잘못된 설정은 사용하지 않는다. */
function readTerrainAnalysisConfig(): TerrainAnalysisConfig | null {
  const demId = String(import.meta.env.VITE_TERRAIN_DEM_ID ?? '').trim();

  const intervalText = String(import.meta.env.VITE_TERRAIN_SAMPLE_INTERVAL_M ?? '').trim();

  const sampleIntervalM = Number(intervalText);

  if (!/^[1-9]\d*$/.test(demId)) {
    return null;
  }

  if (
    intervalText === '' ||
    !Number.isFinite(sampleIntervalM) ||
    sampleIntervalM < 5 ||
    sampleIntervalM > 100 ||
    !Number.isInteger(sampleIntervalM * 10)
  ) {
    return null;
  }

  return {
    demId,
    sampleIntervalM,
  };
}

export const terrainAnalysisConfig = readTerrainAnalysisConfig();
