import { Card } from '@/components/ui';

import { ElevationProfileChart } from './ElevationProfileChart';

/** 요약과 코스 분석에서 동일한 형태로 사용하는 목데이터 고도 섹션이다. */
export function MockElevationProfileSection() {
  return (
    <Card className="mock-elevation-profile" padding="none">
      <h2>고도 변화</h2>
      <div className="mock-elevation-profile__chart">
        <ElevationProfileChart mockData />
      </div>
    </Card>
  );
}
