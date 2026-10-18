import { createRoot } from 'react-dom/client';

import { Button } from '@/components/ui/Button';
import { MapPageLayout } from '@/components/layout';
import '@/styles/global.css';
import './map-page-layout.css';

export function MapPageLayoutFixture() {
  return (
    <MapPageLayout
      bottomNavigation={
        <div className="map-layout-fixture__navigation">
          <button type="button">산 탐색</button>
          <button type="button">맞춤 경로</button>
          <button type="button">내 코스</button>
        </div>
      }
      header={
        <div className="map-layout-fixture__header">
          <strong className="map-layout-fixture__brand">ORDA</strong>
          <span>관악산</span>
          <button type="button">산 검색</button>
        </div>
      }
      mapControls={
        <Button aria-label="지도 레이어" size="sm" variant="secondary">
          층
        </Button>
      }
      panel={
        <section aria-labelledby="map-panel-title">
          <p className="map-layout-fixture__eyebrow">LAYOUT PREVIEW</p>
          <h1 className="map-layout-fixture__title" id="map-panel-title">
            지도 작업 패널
          </h1>
          <p className="map-layout-fixture__description">
            이 목록은 패널 스크롤과 반응형 동작을 확인하기 위한 예시입니다.
          </p>
          <ul className="map-layout-fixture__list">
            {Array.from({ length: 18 }, (_, index) => (
              <li className="map-layout-fixture__item" key={index}>
                <h2>패널 항목 {index + 1}</h2>
                <p>예시 콘텐츠입니다.</p>
              </li>
            ))}
          </ul>
        </section>
      }
      panelFooter={<Button fullWidth>다음</Button>}
      panelSize="expanded"
    />
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Fixture root element를 찾을 수 없습니다.');
}

createRoot(rootElement).render(<MapPageLayoutFixture />);
