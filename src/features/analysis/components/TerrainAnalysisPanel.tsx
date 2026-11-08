import { lazy, Suspense, useState } from 'react';

import easyIcon from '@/assets/analysis/difficulty-easy.svg';
import hardIcon from '@/assets/analysis/difficulty-hard.svg';
import mediumIcon from '@/assets/analysis/difficulty-medium.svg';
import { Badge, Button, Card } from '@/components/ui';

import { SAMPLE_ELEVATION_PROFILE } from '../mocks/terrain';
import type { TerrainAnalysisSample } from '../types/terrainAnalysis';
import { MockElevationProfileSection } from './MockElevationProfileSection';

const ElevationProfileChart = lazy(() =>
  import('./ElevationProfileChart').then((module) => ({ default: module.ElevationProfileChart })),
);

const exampleSamples: readonly TerrainAnalysisSample[] = SAMPLE_ELEVATION_PROFILE.map(
  (point, index) => ({
    seqNo: index + 1,
    distanceM: point.distanceM,
    elevationM: point.elevationM,
  }),
);

interface TerrainAnalysisPanelProps {
  candidateName: string | null;
  mockData?: {
    distanceM: number;
    elevationGainM: number;
  };
}

export function TerrainAnalysisPanel({ candidateName, mockData }: TerrainAnalysisPanelProps) {
  const [showSample, setShowSample] = useState(false);

  if (mockData) {
    const metrics = [
      { label: '총 거리', value: `${(mockData.distanceM / 1000).toFixed(1)}km` },
      { label: '누적 상승', value: `${mockData.elevationGainM}m` },
      { label: '누적 하강', value: '604m' },
      { label: '최고 / 최저', value: '632m / 112m' },
    ];

    return (
      <section aria-label="지형 분석 정보" className="terrain-analysis insights-panel">
        <header className="insights-panel__heading">
          <div>
            <h2>{candidateName} 코스 분석</h2>
            <p>목데이터 분석 결과 · 거리순 고도 표본</p>
          </div>
          <Badge variant="info">중급</Badge>
        </header>

        <div className="terrain-analysis__notice" role="note">
          <strong>완만한 오르막 뒤 후반 급경사 구간이 있어요</strong>
          <p>3.5km 이후 경사가 커지므로 체력 안배와 하산 시간을 고려해주세요.</p>
        </div>

        <MockElevationProfileSection />

        <section aria-label="코스 분석 지표" className="terrain-analysis__metrics-section">
          <dl className="terrain-analysis__metrics">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Card className="terrain-analysis__difficulty-card" padding="md">
          <section aria-labelledby="terrain-difficulty-title" className="terrain-difficulty">
            <header>
              <h3 id="terrain-difficulty-title">구간 난이도 구성</h3>
              <span>경사도·노면 기반 목데이터</span>
            </header>
            <div aria-label="쉬움 28%, 보통 51%, 어려움 21%" className="terrain-difficulty__bar">
              <span className="terrain-difficulty__bar-easy" style={{ width: '28%' }} />
              <span className="terrain-difficulty__bar-medium" style={{ width: '51%' }} />
              <span className="terrain-difficulty__bar-hard" style={{ width: '21%' }} />
            </div>
            <ul aria-label="난이도 비율">
              {[
                { label: '쉬움', value: '28%', icon: easyIcon },
                { label: '보통', value: '51%', icon: mediumIcon },
                { label: '어려움', value: '21%', icon: hardIcon },
              ].map((item) => (
                <li key={item.label}>
                  <img alt="" aria-hidden="true" src={item.icon} />
                  {item.label} <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          </section>
        </Card>

        <p className="insights-disclaimer">
          화면 구성 확인을 위한 목데이터입니다. 실제 API 연결 시 분석 결과로 교체됩니다.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="지형 분석 정보" className="terrain-analysis insights-panel">
      <header className="insights-panel__heading">
        <div>
          <h2>{candidateName ?? '선택 코스 없음'}</h2>
          <p>
            {candidateName
              ? '예시 코스 · 실제 분석 데이터 없음'
              : '코스 결과가 없어 분석을 표시할 수 없어요.'}
          </p>
        </div>
        {showSample ? (
          <Button
            className="insights-mode-button"
            onClick={() => setShowSample(false)}
            size="sm"
            variant="secondary"
          >
            데이터 없음 보기
          </Button>
        ) : null}
      </header>

      {showSample ? (
        <Suspense
          fallback={
            <div className="insights-empty" role="status">
              샘플 차트를 준비하고 있어요.
            </div>
          }
        >
          <ElevationProfileChart samples={exampleSamples} isExample />
        </Suspense>
      ) : (
        <div className="insights-empty" role="status">
          <strong>분석 미제공</strong>
          <p>
            실제 고도·경사 자료가 없어 분석 결과를 표시할 수 없어요. 코스 카드의 숫자는 UI
            예시입니다.
          </p>
          <Button onClick={() => setShowSample(true)} size="sm" variant="secondary">
            샘플 프로파일 보기
          </Button>
        </div>
      )}

      <section aria-label="코스 지표 미제공" className="terrain-analysis__metrics-section">
        <dl className="terrain-analysis__metrics">
          {[
            { label: '총 거리', unit: 'km' },
            { label: '누적 상승', unit: 'm' },
            { label: '누적 하강', unit: 'm' },
            { label: '최고 / 최저', unit: 'm' },
          ].map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>
                <span aria-hidden="true">{metric.label === '최고 / 최저' ? '— / —' : '—'}</span>{' '}
                <span className="sr-only">미제공</span> <small>{metric.unit}</small>
              </dd>
            </div>
          ))}
        </dl>
        <p className="insights-note">코스 지표는 미제공입니다. 샘플 차트에서 산출하지 않습니다.</p>
      </section>

      <section aria-labelledby="terrain-difficulty-title" className="terrain-difficulty">
        <header>
          <h3 id="terrain-difficulty-title">원천 난이도 구성</h3>
          <span>경사도·노면 기반 구간 비율</span>
        </header>
        <div aria-hidden="true" className="terrain-difficulty__empty-bar" />
        <ul aria-label="난이도 비율 미제공">
          {[
            { label: '쉬움', icon: easyIcon },
            { label: '보통', icon: mediumIcon },
            { label: '어려움', icon: hardIcon },
          ].map((item) => (
            <li key={item.label}>
              <img alt="" aria-hidden="true" src={item.icon} />
              {item.label} <span aria-hidden="true">—%</span>{' '}
              <span className="sr-only">미제공</span>
            </li>
          ))}
        </ul>
        <p className="insights-note">경사도·노면 자료가 없어 난이도 비율을 제공하지 않습니다.</p>
      </section>
      <p className="insights-disclaimer">
        실제 DEM 분석 자료와 산출 기준은 연결되지 않았습니다. 샘플 그래프를 등산 계획의 근거로
        사용할 수 없습니다.
      </p>
    </section>
  );
}
