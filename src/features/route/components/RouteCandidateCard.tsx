import counterOne from '@/assets/route/counter-one.svg';
import counterTwo from '@/assets/route/counter-two.svg';
import downloadIcon from '@/assets/route/download.svg';
import editIcon from '@/assets/route/edit.svg';
import facilityIcon from '@/assets/route/facility.svg';
import hikingIcon from '@/assets/route/hiking.svg';
import selectedIcon from '@/assets/route/selected.svg';
import stairsIcon from '@/assets/route/stairs.svg';
import unselectedIcon from '@/assets/route/unselected.svg';
import { Badge, Button, Card } from '@/components/ui';

import { getMockRouteMetrics } from '../mocks/route-results';
import type { MockRouteCandidate } from '../mocks/route-results';

interface RouteCandidateCardProps {
  candidate: MockRouteCandidate;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onExport: () => void;
}

export function RouteCandidateCard({
  candidate,
  index,
  selected,
  onSelect,
  onEdit,
  onExport,
}: RouteCandidateCardProps) {
  return (
    <Card
      aria-label={`예시 코스 ${index + 1}: ${candidate.name}`}
      className={`route-candidate${selected ? ' route-candidate--selected' : ''}`}
      padding="none"
    >
      <button
        aria-label={`예시 코스 ${index + 1}: ${candidate.name} 선택`}
        aria-pressed={selected}
        className="route-candidate__select"
        onClick={onSelect}
        type="button"
      >
        {index < 2 ? (
          <img alt="" aria-hidden="true" src={index === 0 ? counterOne : counterTwo} />
        ) : (
          <span aria-hidden="true" className="route-candidate__number">
            3
          </span>
        )}
        <span className="route-candidate__heading">
          <strong>{candidate.name}</strong>
          <span className="route-candidate__tags">
            <Badge variant="info">추천</Badge>
            <Badge variant="primary">초중급</Badge>
            <Badge variant="primary">조망 좋음</Badge>
          </span>
        </span>
        <img alt="" aria-hidden="true" src={selected ? selectedIcon : unselectedIcon} />
      </button>

      <dl aria-label="예시 지표" className="route-candidate__metrics">
        {getMockRouteMetrics(candidate).map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <div className="route-candidate__bottom">
        <ul aria-label="예시 난이도와 시설 수" className="route-candidate__facts">
          <li>
            <img alt="" aria-hidden="true" src={hikingIcon} />
            {candidate.difficultyLabel}
          </li>
          <li>
            <img alt="" aria-hidden="true" src={stairsIcon} />
            계단 {candidate.stairsCount}곳
          </li>
          <li>
            <img alt="" aria-hidden="true" src={facilityIcon} />
            시설 {candidate.facilityCount}곳
          </li>
        </ul>
        <div className="route-candidate__actions">
          <Button onClick={onEdit} size="sm" variant="secondary">
            <img alt="" aria-hidden="true" src={editIcon} />
            코스 편집
          </Button>
          <Button onClick={onExport} size="sm" variant="quiet">
            <img alt="" aria-hidden="true" src={downloadIcon} />
            내보내기
          </Button>
        </div>
      </div>

      <details className="route-candidate__details">
        <summary>상세보기</summary>
        <p>거리·시간·누적 상승·난이도·시설 수는 모두 디자인 확인용 예시입니다.</p>
        <p>실제 등산로, 경로 선형과 분석 자료는 제공되지 않았습니다.</p>
      </details>
    </Card>
  );
}
