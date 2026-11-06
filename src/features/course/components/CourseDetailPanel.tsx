import type { ReactNode } from 'react';

import facilityIcon from '@/assets/course/course-facility.svg';
import finishIcon from '@/assets/course/course-finish.svg';
import hikingIcon from '@/assets/course/course-hiking.svg';
import parkingIcon from '@/assets/course/course-parking.svg';
import shelterIcon from '@/assets/course/course-shelter.svg';
import stairsIcon from '@/assets/course/course-stairs.svg';
import startIcon from '@/assets/course/course-start.svg';
import toiletIcon from '@/assets/course/course-toilet.svg';
import { Badge, Card, Tabs } from '@/components/ui';

import { getMyCourseMetrics } from '../mocks/my-courses';
import type { MockMyCourse } from '../mocks/my-courses';
import type { CourseDetailResponse } from '../types/course';

interface CourseDetailPanelProps {
  course: CourseDetailResponse;
  mockCourse?: MockMyCourse;
  tab: 'overview' | 'terrain' | 'facilities';
  onTabChange: (value: string) => void;
  overviewAnalysis: ReactNode;
  terrainContent: ReactNode;
  facilitiesContent: ReactNode;
}

/** 원본 m 값을 유지하고 표시할 때만 m 또는 km 단위로 변환한다. */
function formatDistance(lengthM: number): string {
  if (lengthM < 1000) {
    return `${lengthM.toLocaleString('ko-KR', {
      maximumFractionDigits: 1,
    })} m`;
  }

  return `${(lengthM / 1000).toLocaleString('ko-KR', {
    maximumFractionDigits: 2,
  })} km`;
}

/** 실제 코스 정보와 상위 페이지에서 전달한 분석·시설 탭 내용을 표시한다. */
export function CourseDetailPanel({
  course,
  mockCourse,
  tab,
  onTabChange,
  overviewAnalysis,
  terrainContent,
  facilitiesContent,
}: CourseDetailPanelProps) {
  const overview = (
    <div className="my-course-overview">
      {mockCourse ? (
        <Card className="my-course-overview__points" padding="sm">
          <h2>주요 지점</h2>
          <dl>
            {[
              { label: '출발 지점', value: '관악산공원 입구 · 112m', icon: startIcon },
              { label: '도착 지점', value: '연주대 전망대 · 480m', icon: finishIcon },
            ].map((item) => (
              <div key={item.label}>
                <dt>
                  <img alt="" aria-hidden="true" src={item.icon} />
                  {item.label}
                </dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <dl aria-label="코스 요약 지표" className="my-course-metrics">
        {mockCourse ? (
          getMyCourseMetrics(mockCourse).map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))
        ) : (
          <>
            <div>
              <dt>거리</dt>
              <dd>{formatDistance(course.lengthM)}</dd>
            </div>
            <div>
              <dt>예상 시간</dt>
              <dd>미제공</dd>
            </div>
            <div>
              <dt>누적 상승</dt>
              <dd>미제공</dd>
            </div>
          </>
        )}
      </dl>

      {mockCourse ? (
        <dl className="course-detail-facts">
          {[
            { label: '난이도', value: '중급', icon: hikingIcon },
            { label: '계단 구간', value: `${mockCourse.stairsCount}곳`, icon: stairsIcon },
            { label: '주변 시설', value: `${mockCourse.facilityCount}곳`, icon: facilityIcon },
          ].map((item) => (
            <div key={item.label}>
              <dt>
                <img alt="" aria-hidden="true" src={item.icon} />
                {item.label}
              </dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {mockCourse ? (
        overviewAnalysis
      ) : (
        <Card className="my-course-overview__profile" padding="none">
          <h2>고도 프로파일</h2>
          <div className="my-course-overview__analysis">{overviewAnalysis}</div>
        </Card>
      )}

      <div
        className={`my-course-overview__summaries${mockCourse ? ' my-course-overview__summaries--stacked' : ''}`}
      >
        {!mockCourse ? (
          <Card className="my-course-overview__points" padding="sm">
            <h2>주요 지점</h2>
            <p>주요 지점 정보가 아직 제공되지 않아요.</p>
          </Card>
        ) : null}

        <Card className="my-course-overview__facilities" padding="sm">
          <h2>주변 시설</h2>
          {mockCourse ? (
            <dl>
              {[
                { label: '화장실', value: '3곳', icon: toiletIcon },
                { label: '주차장', value: '2곳', icon: parkingIcon },
                { label: '쉼터', value: '2곳', icon: shelterIcon },
              ].map((item) => (
                <div key={item.label}>
                  <dt>
                    <img alt="" aria-hidden="true" src={item.icon} />
                    {item.label}
                  </dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>주변 시설 정보가 아직 제공되지 않아요.</p>
          )}
        </Card>
      </div>
    </div>
  );

  const intro = (
    <>
      <header className="course-detail-intro">
        <div>
          <h1>{mockCourse?.name ?? course.courseName}</h1>
          <p>
            {mockCourse ? (
              <>
                <time dateTime={mockCourse.date}>{mockCourse.date.replaceAll('-', '.')}</time>{' '}
                {mockCourse.category === 'saved' ? '저장 예시' : '가져오기 예시'} |{' '}
                {mockCourse.description}
              </>
            ) : (
              course.memo?.trim() || '등록된 메모가 없어요.'
            )}
          </p>
        </div>
        {mockCourse ? (
          <div className="course-detail-intro__tags">
            <Badge variant="primary">초중급</Badge>
            <Badge variant="primary">조망 좋음</Badge>
          </div>
        ) : null}
      </header>
      {mockCourse ? (
        <p className="my-courses-demo-note">
          예시 코스·요약 지표입니다. 실제 경로 선형·분석·시설 자료는 미제공입니다.
        </p>
      ) : null}
    </>
  );

  if (mockCourse) {
    return (
      <div className="course-detail-panel course-detail-panel--mock">
        {intro}

        <Tabs
          ariaLabel="내 코스 상세 정보"
          items={[
            {
              value: 'overview',
              label: '요약',
              content: tab === 'overview' ? overview : null,
            },
            {
              value: 'terrain',
              label: '코스 분석',
              content: terrainContent,
            },
            {
              value: 'facilities',
              label: '주변 시설',
              content: facilitiesContent,
            },
          ]}
          onValueChange={onTabChange}
          value={tab}
        />
      </div>
    );
  }

  return (
    <div className="course-detail-panel">
      {intro}

      <Tabs
        ariaLabel="내 코스 상세 정보"
        items={[
          {
            value: 'overview',
            label: '코스 비교',
            content: tab === 'overview' ? overview : null,
          },
          {
            value: 'terrain',
            label: '지형 분석',
            content: terrainContent,
          },
          {
            value: 'facilities',
            label: '주변 시설',
            content: facilitiesContent,
          },
        ]}
        onValueChange={onTabChange}
        value={tab}
      />
    </div>
  );
}
