import downloadIcon from '@/assets/route/download.svg';
import editIcon from '@/assets/route/edit.svg';
import facilityIcon from '@/assets/route/facility.svg';
import hikingIcon from '@/assets/route/hiking.svg';
import selectedIcon from '@/assets/icons/selected.svg';
import stairsIcon from '@/assets/route/stairs.svg';
import unselectedIcon from '@/assets/icons/unselected.svg';
import { Badge, Button, Card } from '@/components/ui';

import { getMockRouteMetrics } from '../mocks/route-results';
import type { MockRouteCandidate } from '../mocks/route-results';

interface RouteCandidateCardProps {
  candidate: MockRouteCandidate;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

export function RouteCandidateCard({
  candidate,
  index,
  selected,
  onSelect,
  onEdit,
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
        <span aria-hidden="true" className="route-candidate__number">
          {index + 1}
        </span>
        <span className="route-candidate__heading">
          <strong>{candidate.name}</strong>
          <span className="route-candidate__tags">
            <Badge variant="info">예시</Badge>
            <Badge variant="primary">{candidate.difficultyLabel}</Badge>
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
          <Button size="sm" variant="quiet">
            <img alt="" aria-hidden="true" src={downloadIcon} />
            저장하기
          </Button>
        </div>
      </div>
    </Card>
  );
}
