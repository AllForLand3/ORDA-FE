import { Link } from 'react-router-dom';

import courseThumbnail from '@/assets/course/my-course-thumbnail.png';
import { Card } from '@/components/ui';

import type { CourseListItem } from '../types/courseList';

interface MyCourseCardProps {
  course: CourseListItem;
  detailHref: string;
  editHref: string;
}

export function MyCourseCard({ course, detailHref, editHref }: MyCourseCardProps) {
  return (
    <Card aria-label={course.courseName} className="my-course-card">
      <Link
        aria-label={`${course.courseName} 상세 보기`}
        className="my-course-card__thumbnail"
        to={detailHref}
      >
        <img
          alt=""
          className="my-course-card__image"
          height={120}
          loading="lazy"
          src={courseThumbnail}
          width={383}
        />
        <span className="my-course-card__mountain">{course.mountainName}</span>
        <span className="my-course-card__image-note">예시 이미지</span>
      </Link>
      <h2>
        <Link to={detailHref}>{course.courseName}</Link>
      </h2>
      <p>{course.createType === 'IMPORT' ? '가져온 코스' : '저장한 코스'}</p>
      {course.memo && <p>{course.memo}</p>}
      <dl aria-label="코스 정보" className="my-course-metrics">
        <div>
          <dt>거리</dt>
          <dd>{course.lengthM === null ? '미확인' : `${course.lengthM / 1000}km`}</dd>
        </div>
        <div>
          <dt>예상 시간</dt>
          <dd>{course.estTimeMin === null ? '미확인' : `${course.estTimeMin}분`}</dd>
        </div>
      </dl>
      <div className="my-course-card__links">
        <Link to={detailHref}>코스 상세 보기</Link>
        <Link to={editHref}>편집</Link>
      </div>
    </Card>
  );
}
