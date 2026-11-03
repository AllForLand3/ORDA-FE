/** API 좌표: EPSG:4326, 경도·위도 순서. 지도 좌표를 직접 넣지 않는다. */
export interface CourseGeometry {
  type: 'LineString';
  coordinates: [longitude: number, latitude: number][];
}

export interface CreateCourseRequest {
  mountainId: string;
  courseName: string;
  memo?: string | null;
  createType: 'IMPORT' | 'DRAW';
  geometry: CourseGeometry;
}

/** 누락한 필드는 유지하며, memo의 null/빈 문자열은 메모를 삭제한다. */
export interface UpdateCourseRequest {
  courseName?: string;
  memo?: string | null;
}

export interface CourseDetail {
  courseId: string;
  mountainId: string;
  courseName: string;
  memo: string | null;
  // 조회 DTO는 문자열이다. 생성 요청의 허용 값으로 응답 범위를 추측하지 않는다.
  createType: string;
  revNo: number;
  geometry: CourseGeometry;
  lengthM: number;
}

export interface CourseSnapshot {
  course: CourseDetail;
  /** 응답 헤더의 강한 ETag 원문. 없으면 수정·삭제 전 상세를 다시 조회한다. */
  etag: string | null;
}
