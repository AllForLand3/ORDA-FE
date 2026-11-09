// Figma 46:775의 화면 확인용 숫자다. 실제 관악산 경로·탐색·분석 결과가 아니다.
// API 계약과 무관한 UI 전용 모델이며 경로 Geometry는 제공하지 않는다.
export interface MockRouteCandidate {
  id: string;
  source: 'mock';
  name: string;
  difficultyLabel: string;
  distanceM: number;
  durationMinutes: number;
  elevationGainM: number;
  stairsCount: number;
  facilityCount: number;
  memo: string;
}

export const MOCK_ROUTE_CANDIDATES: readonly MockRouteCandidate[] = [
  {
    id: 'example-ridge',
    source: 'mock',
    name: '능선 조망 코스',
    difficultyLabel: '중급',
    distanceM: 5800,
    durationMinutes: 160,
    elevationGainM: 612,
    stairsCount: 4,
    facilityCount: 7,
    memo: '주말 아침을 위한 산책 코스',
  },
  {
    id: 'example-valley',
    source: 'mock',
    name: '계곡 완만 코스',
    difficultyLabel: '초보',
    distanceM: 5800,
    durationMinutes: 160,
    elevationGainM: 612,
    stairsCount: 4,
    facilityCount: 11,
    memo: '',
  },
  {
    id: 'example-valley-2',
    source: 'mock',
    name: '계곡 완만 코스',
    difficultyLabel: '초보',
    distanceM: 5800,
    durationMinutes: 160,
    elevationGainM: 612,
    stairsCount: 4,
    facilityCount: 11,
    memo: '',
  },
];

export function getMockRouteMetrics(candidate: MockRouteCandidate) {
  return [
    { label: '거리', value: `${candidate.distanceM / 1000}km` },
    {
      label: '예상 시간',
      value: `${Math.floor(candidate.durationMinutes / 60)}시간 ${candidate.durationMinutes % 60}분`,
    },
    { label: '누적 상승', value: `${candidate.elevationGainM}m` },
  ];
}
