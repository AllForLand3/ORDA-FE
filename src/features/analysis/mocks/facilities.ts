// Figma 69:706의 유일한 시설 표기를 UI 예시로 옮긴다.
// 실제 시설 조회·운영 정보·200m 반경 검색·거리 정렬의 결과가 아니다.
export const SAMPLE_FACILITIES = [
  {
    id: 'example-toilet',
    name: '제 1광장 화장실',
    category: '화장실',
    source: 'mock',
  },
] as const;

export const FACILITY_PREVIEW_STATES = [
  { value: 'sample', label: '예시 항목' },
  { value: 'empty', label: '빈 목록 데모' },
  { value: 'missing', label: '정보 미제공' },
] as const;

export const COURSE_DETAIL_MOCK_FACILITIES = [
  {
    id: 'gwanak-entrance-toilet',
    name: '관악산공원 입구 화장실',
    category: '화장실',
    address: '서울 관악구 신림동 203-1',
    hours: '상시 이용 가능',
    access: '무장애 출입구·남녀 구분',
    distance: '경로에서 80m',
  },
  {
    id: 'gwanak-plaza-toilet',
    name: '제1광장 화장실',
    category: '화장실',
    address: '서울 관악구 대학동 산56-1',
    hours: '06:00–20:00',
    access: '남녀 구분',
    distance: '경로에서 120m',
  },
  {
    id: 'yeonjuam-toilet',
    name: '연주암 화장실',
    category: '화장실',
    address: '경기 과천시 자하동길 63',
    hours: '07:00–18:00',
    access: '계단 접근 구간 있음',
    distance: '경로에서 160m',
  },
  {
    id: 'gwanak-parking-1',
    name: '관악산공원 제1주차장',
    category: '주차장',
    address: '서울 관악구 신림동 808-126',
    hours: '05:00–22:00',
    access: '유료·장애인 주차면 있음',
    distance: '출발 지점에서 240m',
  },
  {
    id: 'gwanak-parking-2',
    name: '관악산공원 공영주차장',
    category: '주차장',
    address: '서울 관악구 신림로 23',
    hours: '24시간',
    access: '유료·대형차 제한',
    distance: '출발 지점에서 410m',
  },
  {
    id: 'ridge-shelter',
    name: '능선 쉼터',
    category: '쉼터',
    address: '관악산 능선 구간',
    hours: '상시 이용 가능',
    access: '벤치·차양막',
    distance: '출발 후 2.1km',
  },
  {
    id: 'summit-shelter',
    name: '연주대 전망 쉼터',
    category: '쉼터',
    address: '관악산 연주대 인근',
    hours: '상시 이용 가능',
    access: '벤치·조망 공간',
    distance: '출발 후 4.6km',
  },
] as const;
