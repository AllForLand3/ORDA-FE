export type RoutePointRole = 'origin' | 'destination';
export type RouteCoordinate = readonly [longitude: number, latitude: number];

export interface RoutePlace {
  id: string;
  name: string;
  address: string;
  coordinates: RouteCoordinate;
  source: 'example' | 'map';
}

// 검색 UI 확인용 장소와 표시 좌표다. 실제 지오코딩·경로 탐색 결과가 아니다.
export const ROUTE_PLACE_MOCKS: readonly RoutePlace[] = [
  {
    id: 'seoul-national-university-research-center',
    name: '서울대 건설환경종합연구소 앞',
    address: '서울 관악구 관악로 1 · 예시 장소',
    coordinates: [126.9518, 37.4587],
    source: 'example',
  },
  {
    id: 'gwanaksan-yeonjudae',
    name: '관악산 연주대',
    address: '관악산 · 예시 장소',
    coordinates: [126.96444, 37.44472],
    source: 'example',
  },
  {
    id: 'gwanaksan-entrance',
    name: '관악산 서울대입구',
    address: '서울 관악구 · 예시 장소',
    coordinates: [126.9523, 37.4552],
    source: 'example',
  },
];

export const ROUTE_DIFFICULTIES = [
  {
    id: 'beginner',
    label: '초급',
    description: '가볍게 등산을 즐기고 싶어요\n완만한 코스를 추천해요',
  },
  {
    id: 'intermediate',
    label: '중급',
    description: '적당한 오르막도 괜찮아요\n다양한 코스를 탐색해요',
  },
  {
    id: 'experienced',
    label: '숙련',
    description: '난도가 있는 코스도 괜찮아요\n긴 거리의 코스도 탐색해요',
  },
] as const;

export type RouteDifficulty = (typeof ROUTE_DIFFICULTIES)[number]['id'];

export const ROUTE_PRIORITIES = [
  { id: 'distance', label: '거리 우선', description: '이동 거리가 짧은 경로를 찾아요' },
  { id: 'gentle-slope', label: '완만한 경사', description: '경사 부담이 적은 경로를 찾아요' },
  { id: 'fewer-stairs', label: '계단 적게', description: '계단 구간이 적은 경로를 찾아요' },
] as const;

export type RoutePriority = (typeof ROUTE_PRIORITIES)[number]['id'];

export const ROUTE_FACILITIES = [
  { id: 'restroom', label: '화장실' },
  { id: 'parking', label: '주차장' },
  { id: 'shelter', label: '쉼터' },
  { id: 'viewpoint', label: '조망점' },
  { id: 'hazard', label: '위험 관련 지점' },
] as const;

export type RouteFacility = (typeof ROUTE_FACILITIES)[number]['id'];
