export interface TerrainAnalysisConfig {
  demId: string;
  sampleIntervalM: number;
}

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
