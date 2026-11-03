import { Tabs } from '@/components/ui';

import type { CourseDetail } from '../types/course';

interface Props {
  course: CourseDetail;
  tab: string;
  onTabChange: (tab: string) => void;
}

export function CourseDetailPanel({ course, tab, onTabChange }: Props) {
  return (
    <div className="course-detail-panel">
      <header className="course-detail-intro">
        <div>
          <h1>{course.courseName}</h1>
          <p>
            {course.createType === 'IMPORT'
              ? '가져온 코스'
              : course.createType === 'DRAW'
                ? '직접 그린 코스'
                : '저장된 코스'}
          </p>
        </div>
      </header>
      <Tabs
        ariaLabel="내 코스 상세 정보"
        value={tab}
        onValueChange={onTabChange}
        items={[
          {
            value: 'overview',
            label: '코스 정보',
            content: (
              <div className="my-course-overview">
                <dl aria-label="코스 요약" className="my-course-metrics">
                  <div>
                    <dt>거리</dt>
                    <dd>{course.lengthM.toLocaleString('ko-KR')} m</dd>
                  </div>
                </dl>
                <section aria-label="코스 메모">
                  <h2>메모</h2>
                  <p className="course-detail-memo">{course.memo ?? '등록된 메모가 없습니다.'}</p>
                </section>
                <p>예상 시간·난이도·고도 분석 결과는 아직 제공하지 않습니다.</p>
              </div>
            ),
          },
          {
            value: 'terrain',
            label: '지형 분석',
            content: <p>이 코스의 지형 분석 결과는 아직 제공하지 않습니다.</p>,
          },
          {
            value: 'facilities',
            label: '주변 시설',
            content: <p>이 코스의 주변 시설 정보는 아직 제공하지 않습니다.</p>,
          },
        ]}
      />
    </div>
  );
}
