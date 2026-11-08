export interface CourseNearbySummary {
  radiusM: number;
  spotDataAvailable: boolean;
  facilityDataAvailable: boolean;
  viewSpotCount: number | null;
  stairSpotCount: number | null;
  toiletCount: number | null;
  parkingCount: number | null;
}

export interface CourseListItem {
  courseId: string;
  mountainId: string;
  mountainName: string;
  courseName: string;
  memo: string | null;
  createType: string;
  lengthM: number | null;
  estTimeMin: number | null;
  // 이전 버전의 목록 응답에서도 카드가 동작하도록 추가 필드는 선택적으로 받는다.
  savedAt?: string | null;
  difficultyCode?: string | null;
  nearby?: CourseNearbySummary | null;
}

export interface CourseListPage {
  items: CourseListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
