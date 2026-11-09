export type MountainRegion = '서울' | '경기';
export type MountainDifficulty = '초중급' | '중급';

export interface MountainSummary {
  id: string;
  name: string;
  region: MountainRegion;
  district: string;
  elevationMeters: number;
  difficulty: MountainDifficulty;
  tags: readonly string[];
  popularity: number;
  coordinates: readonly [longitude: number, latitude: number];
}

// 화면 확인용 예시 데이터이며 서버 조회 결과가 아니다.
// 관악산 연주대 좌표: https://kr.geoview.info/yeonjudae%2C3445797247n
// 북한산 백운대 좌표: https://mapcarta.com/25948498
// 청계산 좌표: https://data.visitkorea.or.kr/page/125452
export const MOUNTAIN_MOCKS: readonly MountainSummary[] = [
  {
    id: 'gwanaksan',
    name: '관악산',
    region: '서울',
    district: '관악구',
    elevationMeters: 629,
    difficulty: '중급',
    tags: ['도심 접근성', '순환 코스'],
    popularity: 1,
    coordinates: [126.96444, 37.44472],
  },
  {
    id: 'bukhansan',
    name: '북한산',
    region: '서울',
    district: '강북구',
    elevationMeters: 836,
    difficulty: '초중급',
    tags: ['전망 좋음', '다양한 코스'],
    popularity: 2,
    coordinates: [126.978, 37.65863],
  },
  {
    id: 'cheonggyesan',
    name: '청계산',
    region: '경기',
    district: '과천시',
    elevationMeters: 618,
    difficulty: '초중급',
    tags: ['숲길', '대중교통 접근'],
    popularity: 3,
    coordinates: [127.0543676446, 37.4416867721],
  },
];

export const DEFAULT_MOUNTAIN_ID = 'gwanaksan';
