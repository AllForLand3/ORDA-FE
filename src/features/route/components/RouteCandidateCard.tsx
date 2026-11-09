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
import type {
  RouteCandidateNearbyCounts,
  RouteSearchCandidateView,
} from '../types/route-candidate-view';

interface RouteCandidateCardProps {
  candidate: MockRouteCandidate | RouteSearchCandidateView;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  // 탐색 결과 후보의 계단·시설 수. 전달하지 않으면 해당 줄을 표시하지 않는다.
  nearbyCounts?: RouteCandidateNearbyCounts;
}

const MISSING_VALUE = '정보 없음';

function formatDistance(distanceM: number) {
  // API 단위는 m다. 1km 이상은 km로 바꿔 소수 둘째 자리까지 표시한다.
  if (!Number.isFinite(distanceM)) return MISSING_VALUE;
  return distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM / 1000).toFixed(2)}km`;
}

function formatDuration(durationMinutes: number | null) {
  if (durationMinutes === null || !Number.isFinite(durationMinutes)) return MISSING_VALUE;
  const totalMinutes = Math.round(durationMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

/** 계단·시설 수를 표시한다. 자료가 없거나 조회 전(null)이면 0이 아니라 '정보 없음'으로 둔다. */
function formatCount(count: number | null) {
  return count === null ? MISSING_VALUE : `${count}곳`;
}

function getRouteSearchMetrics(candidate: RouteSearchCandidateView) {
  return [
    { label: '거리', value: formatDistance(candidate.distanceM) },
    { label: '예상 시간', value: formatDuration(candidate.durationMinutes) },
    { label: '누적 상승', value: MISSING_VALUE },
  ];
}

/** 예시·탐색 결과 후보 카드. 탐색 결과는 페이지에서 받은 계단·시설 수가 있을 때만 그 줄을 표시한다. */
export function RouteCandidateCard({
  candidate,
  index,
  selected,
  onSelect,
  onEdit,
  nearbyCounts,
}: RouteCandidateCardProps) {
  const isMock = candidate.source === 'mock';
  const labelPrefix = isMock ? '예시 코스' : '경로 후보';

  return (
    <Card
      aria-label={`${labelPrefix} ${index + 1}: ${candidate.name}`}
      className={`route-candidate${selected ? ' route-candidate--selected' : ''}`}
      padding="none"
    >
      <button
        aria-label={`${labelPrefix} ${index + 1}: ${candidate.name} 선택`}
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
            {candidate.source === 'mock' ? (
              <>
                <Badge variant="info">예시</Badge>
                <Badge variant="primary">{candidate.difficultyLabel}</Badge>
              </>
            ) : (
              <>
                <Badge variant="success">탐색 결과</Badge>
                <Badge variant="primary">{candidate.priorityLabel}</Badge>
              </>
            )}
          </span>
        </span>
        <img alt="" aria-hidden="true" src={selected ? selectedIcon : unselectedIcon} />
      </button>

      <dl aria-label={isMock ? '예시 지표' : '탐색 지표'} className="route-candidate__metrics">
        {(candidate.source === 'mock'
          ? getMockRouteMetrics(candidate)
          : getRouteSearchMetrics(candidate)
        ).map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>

      {candidate.source === 'mock' ? (
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
      ) : nearbyCounts ? (
        <div className="route-candidate__bottom">
          <ul aria-label="계단과 시설 수" className="route-candidate__facts">
            <li>
              <img alt="" aria-hidden="true" src={stairsIcon} />
              계단 {formatCount(nearbyCounts.stairs)}
            </li>
            <li>
              <img alt="" aria-hidden="true" src={facilityIcon} />
              시설 {formatCount(nearbyCounts.facilities)}
            </li>
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
