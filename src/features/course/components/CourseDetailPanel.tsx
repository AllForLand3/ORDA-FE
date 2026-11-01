import type { ReactNode } from 'react';

import { Card, Tabs } from '@/components/ui';

import type { CourseDetailResponse } from '../types/course';

interface CourseDetailPanelProps {
  course: CourseDetailResponse;
  tab: 'overview' | 'terrain' | 'facilities';
  onTabChange: (value: string) => void;
  overviewAnalysis: ReactNode;
  terrainContent: ReactNode;
  facilitiesContent: ReactNode;
}

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
      <dl aria-label="코스 요약 지표" className="my-course-metrics">
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
      </dl>

      <Card className="my-course-overview__profile" padding="none">
        <h2>고도 프로파일</h2>
        <div className="my-course-overview__analysis">{overviewAnalysis}</div>
      </Card>

      <div className="my-course-overview__summaries">
        <Card padding="sm">
          <h2>주요 지점</h2>
          <p>주요 지점 정보가 아직 제공되지 않아요.</p>
        </Card>

        <Card padding="sm">
          <h2>주변 시설</h2>
          <p>주변 시설 정보가 아직 제공되지 않아요.</p>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="course-detail-panel">
      <header className="course-detail-intro">
        <div>
          <h1>{course.courseName}</h1>
          <p>{course.memo?.trim() || '등록된 메모가 없어요.'}</p>
        </div>
      </header>

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
