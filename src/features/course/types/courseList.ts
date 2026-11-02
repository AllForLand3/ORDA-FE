export interface CourseListItem {
  courseId: string;
  mountainId: string;
  mountainName: string;
  courseName: string;
  memo: string | null;
  createType: string;
  lengthM: number | null;
  estTimeMin: number | null;
}
