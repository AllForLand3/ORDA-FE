import type { ReactNode } from 'react';

import facilityIcon from '@/assets/course/course-facility.svg';
import finishIcon from '@/assets/course/course-finish.svg';
import hikingIcon from '@/assets/course/course-hiking.svg';
import parkingIcon from '@/assets/course/course-parking.svg';
import shelterIcon from '@/assets/course/course-shelter.svg';
import stairsIcon from '@/assets/course/course-stairs.svg';
import startIcon from '@/assets/course/course-start.svg';
import summitIcon from '@/assets/course/course-summit.svg';
import toiletIcon from '@/assets/course/course-toilet.svg';
import { Badge, Card, Tabs } from '@/components/ui';

import { getMyCourseMetrics } from '../mocks/my-courses';
import type { MockMyCourse } from '../mocks/my-courses';

interface CourseDetailPanelProps {
  course: MockMyCourse;
  tab: 'overview' | 'terrain' | 'facilities';
  onTabChange: (value: string) => void;
  overviewAnalysis: ReactNode;
  terrainContent: ReactNode;
  facilitiesContent: ReactNode;
}

export function CourseDetailPanel({
  course,
  tab,
  onTabChange,
  overviewAnalysis,
  terrainContent,
  facilitiesContent,
}: CourseDetailPanelProps) {
  const overview = (
    <div className="my-course-overview">
      <dl aria-label="예시 요약 지표" className="my-course-metrics">
        {getMyCourseMetrics(course).map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="course-detail-facts">
        {[
          { label: '난이도', value: '중급', icon: hikingIcon },
          { label: '계단 구간', value: `${course.stairsCount}곳`, icon: stairsIcon },
          { label: '주변 시설', value: `${course.facilityCount}곳`, icon: facilityIcon },
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
      <Card className="my-course-overview__profile" padding="none">
        <h2>고도 프로파일</h2>
        <div className="my-course-overview__analysis">{overviewAnalysis}</div>
      </Card>
      <div className="my-course-overview__summaries">
        <Card padding="sm">
          <h2>주요 지점</h2>
          <dl>
            {[
              { label: '출발 지점', icon: startIcon },
              { label: '연주대', icon: summitIcon },
              { label: '도착 지점', icon: finishIcon },
            ].map((item) => (
              <div key={item.label}>
                <dt>
                  <img alt="" aria-hidden="true" src={item.icon} />
                  {item.label}
                </dt>
                <dd>고도 미제공</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card padding="sm">
          <h2>주변 시설</h2>
          <dl>
            {[
              { label: '화장실', icon: toiletIcon },
              { label: '주차장', icon: parkingIcon },
              { label: '쉼터', icon: shelterIcon },
            ].map((item) => (
              <div key={item.label}>
                <dt>
                  <img alt="" aria-hidden="true" src={item.icon} />
                  {item.label}
                </dt>
                <dd>미제공</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="course-detail-panel">
      <header className="course-detail-intro">
        <div>
          <h1>{course.name}</h1>
          <p>
            <time dateTime={course.date}>{course.date.replaceAll('-', '.')}</time>{' '}
            {course.category === 'saved' ? '저장 예시' : '가져오기 예시'} | {course.description}
          </p>
        </div>
        <div className="course-detail-intro__tags">
          <Badge variant="primary">초중급</Badge>
          <Badge variant="primary">조망 좋음</Badge>
        </div>
      </header>
      <p className="my-courses-demo-note">
        예시 코스·요약 지표입니다. 실제 경로 선형·분석·시설 자료는 미제공입니다.
      </p>
      <Tabs
        ariaLabel="내 코스 상세 정보"
        items={[
          { value: 'overview', label: '코스 비교', content: tab === 'overview' ? overview : null },
          { value: 'terrain', label: '지형 분석', content: terrainContent },
          { value: 'facilities', label: '주변 시설', content: facilitiesContent },
        ]}
        onValueChange={onTabChange}
        value={tab}
      />
    </div>
  );
}
