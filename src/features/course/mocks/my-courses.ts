// Figma 117:762의 저장 4개·가져온 코스 1개 구성을 확인하기 위한 UI 전용 예시다.
// 서버 저장·파일 가져오기·실제 경로 탐색·분석 결과와 연결하지 않는다.
// 원본에 없는 이름 접미사와 날짜는 검색·정렬 확인용이며 경로 Geometry는 없다.
export interface MockMyCourse {
  id: string;
  name: string;
  category: 'saved' | 'imported';
  source: 'mock';
  date: string;
  mountainName: string;
  description: string;
  distanceM: number;
  durationMinutes: number;
  elevationGainM: number;
  stairsCount: number;
  facilityCount: number;
}

const exampleMetrics = {
  source: 'mock',
  mountainName: '관악산',
  description: '전망이 좋은 능선을 따라 걷는 코스입니다.',
  distanceM: 5800,
  durationMinutes: 160,
  elevationGainM: 612,
  stairsCount: 4,
  facilityCount: 7,
} as const;

export const MOCK_MY_COURSES: readonly MockMyCourse[] = [
  {
    ...exampleMetrics,
    id: 'example-ridge-1',
    name: '능선 조망 코스',
    category: 'saved',
    date: '2026-10-04',
  },
  {
    ...exampleMetrics,
    id: 'example-ridge-2',
    name: '능선 조망 코스 · 예시 2',
    category: 'saved',
    date: '2026-10-03',
  },
  {
    ...exampleMetrics,
    id: 'example-ridge-3',
    name: '능선 조망 코스 · 예시 3',
    category: 'saved',
    date: '2026-10-02',
  },
  {
    ...exampleMetrics,
    id: 'example-ridge-4',
    name: '능선 조망 코스 · 예시 4',
    category: 'saved',
    date: '2026-10-01',
  },
  {
    ...exampleMetrics,
    id: 'example-imported-1',
    name: '가져온 코스 · 예시',
    category: 'imported',
    date: '2026-10-05',
    description: '가져온 코스 목록 확인용 예시입니다. 실제 파일은 가져오지 않았습니다.',
  },
];

export function getMyCourseMetrics(course: MockMyCourse) {
  return [
    { label: '거리', value: `${course.distanceM / 1000}km` },
    {
      label: '예상 시간',
      value: `${Math.floor(course.durationMinutes / 60)}시간 ${course.durationMinutes % 60}분`,
    },
    { label: '누적 상승', value: `${course.elevationGainM}m` },
  ];
}
