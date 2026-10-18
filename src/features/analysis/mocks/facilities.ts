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
