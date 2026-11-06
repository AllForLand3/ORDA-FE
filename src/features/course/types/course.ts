export interface CourseLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface CourseDetailResponse {
  courseId: string;
  mountainId: string;
  courseName: string;
  memo: string | null;
  createType: string;
  revNo: number;
  geometry: CourseLineString;
  lengthM: number;
}
