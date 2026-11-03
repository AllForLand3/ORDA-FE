import { Link } from 'react-router-dom';

import courseThumbnail from '@/assets/course/my-course-thumbnail.png';
import parkingIcon from '@/assets/course/course-parking.svg';
import stairsIcon from '@/assets/course/course-stairs.svg';
import toiletIcon from '@/assets/course/course-toilet.svg';
import { Card } from '@/components/ui';

import type { CourseListItem } from '../types/courseList';

interface MyCourseCardProps {
  course: CourseListItem;
  detailHref: string;
  editHref: string;
}

const savedDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function difficultyLabel(code: string | null | undefined): string {
  switch (code) {
    case 'EASY':
      return '쉬움';
    case 'NORMAL':
      return '보통';
    case 'HARD':
      return '어려움';
    default:
      return code == null ? '미산정' : '미확인';
  }
}

function countLabel(count: number | null | undefined, dataAvailable: boolean): string {
  return dataAvailable && count != null ? `${count}곳` : '정보 없음';
}

export function MyCourseCard({ course, detailHref, editHref }: MyCourseCardProps) {
  const savedDate = course.savedAt ? new Date(course.savedAt) : null;
  const hasSavedDate = savedDate !== null && Number.isFinite(savedDate.getTime());
  const nearby = course.nearby;

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
          height={160}
          loading="lazy"
          src={courseThumbnail}
          width={383}
        />
        <span className="my-course-card__mountain">{course.mountainName}</span>
        <span className="my-course-card__image-note">예시 이미지</span>
      </Link>
      <div className="my-course-card__body">
        <div className="my-course-card__meta">
          <span className="my-course-card__type">
            {course.createType === 'IMPORT' ? '가져온 코스' : '저장한 코스'}
          </span>
          <span className="my-course-card__date">
            저장일{' '}
            {hasSavedDate ? (
              <time dateTime={savedDate.toISOString()}>{savedDateFormatter.format(savedDate)}</time>
            ) : (
              '미확인'
            )}
          </span>
        </div>
        <h2>
          <Link to={detailHref}>{course.courseName}</Link>
        </h2>
        {course.memo && <p className="my-course-card__memo">{course.memo}</p>}
        <dl aria-label="코스 정보" className="my-course-metrics">
          <div>
            <dt>거리</dt>
            <dd>{course.lengthM === null ? '미확인' : `${course.lengthM / 1000}km`}</dd>
          </div>
          <div>
            <dt>예상 시간</dt>
            <dd>{course.estTimeMin === null ? '미확인' : `${course.estTimeMin}분`}</dd>
          </div>
          <div>
            <dt>난이도</dt>
            <dd>{difficultyLabel(course.difficultyCode)}</dd>
          </div>
        </dl>
        <section aria-label="주변 정보" className="my-course-card__nearby">
          <h3>주변 편의시설</h3>
          <ul aria-label="편의시설 개수" className="my-course-card__facilities">
            <li>
              <img alt="" aria-hidden="true" src={toiletIcon} width={20} height={20} />
              <span>화장실</span>
              <strong>
                {countLabel(nearby?.toiletCount, nearby?.facilityDataAvailable ?? false)}
              </strong>
            </li>
            <li>
              <img alt="" aria-hidden="true" src={parkingIcon} width={20} height={20} />
              <span>주차장</span>
              <strong>
                {countLabel(nearby?.parkingCount, nearby?.facilityDataAvailable ?? false)}
              </strong>
            </li>
          </ul>
          <div aria-label="조망과 계단 지점" className="my-course-card__facts">
            <span>
              조망 지점{' '}
              <strong>
                {countLabel(nearby?.viewSpotCount, nearby?.spotDataAvailable ?? false)}
              </strong>
            </span>
            <span>
              <img alt="" aria-hidden="true" src={stairsIcon} width={16} height={16} />
              계단 지점{' '}
              <strong>
                {countLabel(nearby?.stairSpotCount, nearby?.spotDataAvailable ?? false)}
              </strong>
            </span>
          </div>
          <p className="my-course-card__note">
            {nearby
              ? `코스 반경 ${nearby.radiusM}m 내 등록된 지점·시설 기준입니다.`
              : '주변 정보가 아직 제공되지 않는 코스입니다.'}
          </p>
        </section>
        <div className="my-course-card__links">
          <Link to={detailHref}>
            코스 상세 보기 <span aria-hidden="true">↗</span>
          </Link>
          <Link to={editHref}>편집</Link>
        </div>
      </div>
    </Card>
  );
}
