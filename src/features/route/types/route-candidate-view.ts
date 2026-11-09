// 경로 탐색 API 후보를 카드에 표시하기 위한 화면 모델이다. API 응답 타입과 구분한다.
// 누적 상승·계단·시설 수는 API에 없으므로 필드를 두지 않는다.
export interface RouteSearchCandidateView {
  id: string;
  source: 'api';
  rank: number;
  name: string;
  priorityLabel: string;
  distanceM: number;
  durationMinutes: number | null;
}

// 후보 주변 조회 결과를 페이지에서 받아 카드에 표시하는 계단·시설 수다. 자료가 없거나 조회 전이면 null이다.
export interface RouteCandidateNearbyCounts {
  stairs: number | null;
  facilities: number | null;
}
