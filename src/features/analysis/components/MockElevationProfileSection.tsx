import { Card } from '@/components/ui';

import { SAMPLE_ELEVATION_PROFILE } from '../mocks/terrain';
import type { TerrainAnalysisSample } from '../types/terrainAnalysis';

import { ElevationProfileChart } from './ElevationProfileChart';

const exampleSamples: readonly TerrainAnalysisSample[] = SAMPLE_ELEVATION_PROFILE.map(
  (point, index) => ({
    seqNo: index + 1,
    distanceM: point.distanceM,
    elevationM: point.elevationM,
  }),
);

/** 요약과 코스 분석에서 동일한 형태로 사용하는 목데이터 고도 섹션이다. */
export function MockElevationProfileSection() {
  return (
    <Card className="mock-elevation-profile" padding="none">
      <h2>고도 변화</h2>
      <div className="mock-elevation-profile__chart">
        <ElevationProfileChart samples={exampleSamples} isExample />
      </div>
    </Card>
  );
}
