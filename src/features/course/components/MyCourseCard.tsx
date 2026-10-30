import { Link } from 'react-router-dom';

import deleteIcon from '@/assets/course/course-delete.svg';
import mapIcon from '@/assets/course/course-map.svg';
import mountainIcon from '@/assets/course/course-mountain.svg';
import thumbnail from '@/assets/course/my-course-thumbnail.png';
import downloadIcon from '@/assets/route/download.svg';
import editIcon from '@/assets/route/edit.svg';
import facilityIcon from '@/assets/route/facility.svg';
import hikingIcon from '@/assets/route/hiking.svg';
import stairsIcon from '@/assets/route/stairs.svg';
import { Badge, Button, Card } from '@/components/ui';

import { getMyCourseMetrics } from '../mocks/my-courses';
import type { MockMyCourse } from '../mocks/my-courses';

interface MyCourseCardProps {
  course: MockMyCourse;
  detailHref: string;
  editHref: string;
}

export function MyCourseCard({ course, detailHref, editHref }: MyCourseCardProps) {
  return (
    <Card aria-label={course.name} className="my-course-card" padding="none">
      <Link
        aria-label={`${course.name} 상세 보기`}
        className="my-course-card__thumbnail"
        to={detailHref}
      >
        <img alt="" className="my-course-card__image" src={thumbnail} />
        <span className="my-course-card__mountain">
          <img alt="" aria-hidden="true" src={mountainIcon} />
          {course.mountainName}
        </span>
        <span className="my-course-card__image-note">예시 이미지</span>
      </Link>
      <h2>
        <Link to={detailHref}>{course.name}</Link>
      </h2>
      <p className="my-course-card__date">
        <time dateTime={course.date}>{course.date.replaceAll('-', '.')}</time>{' '}
        {course.category === 'saved' ? '저장 예시' : '가져오기 예시'}
      </p>
      <dl aria-label="예시 코스 지표" className="my-course-metrics">
        {getMyCourseMetrics(course).map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="my-course-card__facts">
        <Badge variant="primary">초중급</Badge>
        <Badge variant="primary">조망 좋음</Badge>
        <span>
          <img alt="" aria-hidden="true" src={hikingIcon} />
          중급
        </span>
        <span>
          <img alt="" aria-hidden="true" src={stairsIcon} />
          계단 {course.stairsCount}곳
        </span>
        <span>
          <img alt="" aria-hidden="true" src={facilityIcon} />
          시설 {course.facilityCount}곳
        </span>
      </div>
      <div className="my-course-card__links">
        <div className="my-course-card__links">
          <Link to={detailHref}>
            <span
              aria-hidden="true"
              className="my-course-card__link-icon"
              style={{ maskImage: `url("${mapIcon}")` }}
            />
            코스 상세 보기
          </Link>
        </div>
      </div>
      <div aria-label="코스 관리" className="my-course-card__actions">
        <Link className="my-course-card__action my-course-card__action--standard" to={editHref}>
          <span
            aria-hidden="true"
            className="my-course-card__action-icon"
            style={{ maskImage: `url("${editIcon}")` }}
          />
          편집
        </Link>
        <Link
          className="my-course-card__action my-course-card__action--standard"
          to={`${detailHref}&export=1`}
        >
          <span
            aria-hidden="true"
            className="my-course-card__action-icon"
            style={{ maskImage: `url("${downloadIcon}")` }}
          />
          내보내기
        </Link>
        <Button
          aria-disabled="true"
          className="my-course-card__action my-course-card__action--danger"
          size="sm"
          variant="quiet"
        >
          <span
            aria-hidden="true"
            className="my-course-card__action-icon"
            style={{ maskImage: `url("${deleteIcon}")` }}
          />
          삭제
        </Button>
      </div>
    </Card>
  );
}
