// ECharts 표시·툴팁·resize 확인용으로 직접 정의한 도식용 샘플이다.
// 관악산, 선택 코스, DEM, 실제 고도·경사 분석과 무관하며 경사도는 산출하지 않는다.
export interface SampleElevationPoint {
  distanceM: number;
  elevationM: number;
}

export const SAMPLE_ELEVATION_PROFILE: readonly SampleElevationPoint[] = [
  { distanceM: 0, elevationM: 112 },
  { distanceM: 400, elevationM: 150 },
  { distanceM: 800, elevationM: 220 },
  { distanceM: 1200, elevationM: 218 },
  { distanceM: 1700, elevationM: 315 },
  { distanceM: 2100, elevationM: 300 },
  { distanceM: 2600, elevationM: 430 },
  { distanceM: 3000, elevationM: 405 },
  { distanceM: 3500, elevationM: 475 },
  { distanceM: 4100, elevationM: 528 },
  { distanceM: 4600, elevationM: 500 },
  { distanceM: 5200, elevationM: 460 },
  { distanceM: 5800, elevationM: 480 },
];
