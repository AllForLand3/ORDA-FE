import { useState } from 'react';

import { Badge, Card } from '@/components/ui';

import { FACILITY_PREVIEW_STATES, SAMPLE_FACILITIES } from '../mocks/facilities';

interface NearbyFacilitiesPanelProps {
  candidateName: string | null;
}

export function NearbyFacilitiesPanel({ candidateName }: NearbyFacilitiesPanelProps) {
  const [preview, setPreview] = useState('sample');

  return (
    <section aria-label="주변 시설 정보" className="nearby-facilities insights-panel">
      <header className="insights-panel__heading">
        <div>
          <h2>{candidateName ? `${candidateName} 주변 시설` : '선택 코스 없음'}</h2>
          <p>
            {preview === 'sample'
              ? '예시 항목 1개 · 거리 정보 미제공'
              : '실제 시설 조회 결과가 아닙니다.'}
          </p>
        </div>
      </header>
      <div className="nearby-facilities__toolbar">
        <span>경로 반경·거리순 정렬 미연결</span>
        <label>
          <span className="sr-only">시설 화면 상태</span>
          <select onChange={(event) => setPreview(event.target.value)} value={preview}>
            {FACILITY_PREVIEW_STATES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="nearby-facilities__notice" role="status">
        <strong>시설 정보 미제공</strong>
        <p>
          실제 시설 위치와 운영 정보는 연결되지 않았어요. 예시 항목으로 실제 시설의 유무를 판단할 수
          없습니다.
        </p>
      </div>

      {preview === 'sample' ? (
        <ul aria-label="디자인 확인용 예시 시설" className="nearby-facilities__list">
          {SAMPLE_FACILITIES.map((facility) => (
            <li key={facility.id}>
              <Card className="nearby-facility-card" padding="md">
                <div className="nearby-facility-card__heading">
                  <h3>{facility.name}</h3>
                  <Badge variant="info">예시</Badge>
                </div>
                <p>{facility.category} · 실제 위치·거리 미제공</p>
                <details>
                  <summary>시설 상세 보기</summary>
                  <dl>
                    {[
                      { label: '주소', value: '미제공' },
                      { label: '운영 시간', value: '미제공' },
                      { label: '이용·접근성 정보', value: '미제공' },
                      { label: '선택 코스와의 거리', value: '미제공' },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    디자인 확인을 위한 예시 항목입니다. 운영 여부와 이용 조건이 확인되지 않아
                    길찾기·지도 위치 표시를 제공하지 않습니다.
                  </p>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      ) : preview === 'empty' ? (
        <div className="insights-empty" role="status">
          <strong>표시할 시설이 없어요</strong>
          <p>빈 목록 UI 데모입니다. 실제로 주변에 시설이 없다는 뜻은 아닙니다.</p>
        </div>
      ) : (
        <div className="insights-empty" role="note">
          <strong>시설 데이터가 연결되지 않았어요</strong>
          <p>실제 시설 목록이 제공되면 이 영역에서 확인할 수 있어요.</p>
        </div>
      )}
    </section>
  );
}
