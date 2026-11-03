import axios from 'axios';

import { Button, Card } from '@/components/ui';
import type { ApiErrorResponse } from '@/shared/types/api';

import { useCourseNearby } from '../hooks/useCourseNearby';
import type { NearbyPlaceKind } from '../hooks/useCourseNearby';

import { NearbyPlaceDetails } from './NearbyPlaceDetails';

const KIND_LABELS: Record<NearbyPlaceKind, string> = {
  TOILET: '화장실',
  PARKING: '주차장',
  SHELTER: '쉼터',
};

interface CourseNearbyFacilitiesProps {
  candidateName: string | null;
  courseId: string;
  revNo?: number;
}

function formatDistance(distanceM: number): string {
  return `${distanceM.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}m`;
}

const FALLBACK_ERROR = {
  title: '주변 시설을 불러오지 못했어요',
  description: '잠시 후 다시 시도해 주세요.',
};

/** 네트워크 실패와 BE 오류 code를 구분해 화면 안내로 바꾼다. 화면 분기는 code 기준이다. */
function errorMessage(error: unknown): { title: string; description: string } {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return FALLBACK_ERROR;
  if (!error.response) {
    return {
      title: '서버에 연결할 수 없어요',
      description: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
    };
  }

  const code = error.response.data?.code;
  if (error.response.status === 401 || code === 'UNAUTHORIZED') {
    return { title: '로그인이 필요해요', description: '다시 로그인한 뒤 확인해 주세요.' };
  }

  switch (code) {
    case 'COURSE_NOT_FOUND':
      return {
        title: '코스를 찾을 수 없어요',
        description: '삭제되었거나 접근할 수 없는 코스예요.',
      };
    case 'CONFLICT':
      return {
        title: '코스가 변경되었어요',
        description: '최신 코스 정보를 다시 불러온 뒤 확인해 주세요.',
      };
    case 'COURSE_STATE_UNAVAILABLE':
      return {
        title: '코스 정보를 확인할 수 없어요',
        description: '코스 경로 정보에 문제가 있어 주변 시설을 조회하지 못했어요.',
      };
    default:
      return {
        ...FALLBACK_ERROR,
        description: error.response.data?.message ?? FALLBACK_ERROR.description,
      };
  }
}

/** 실제 코스의 주변 화장실·주차장·쉼터를 BE 조회 결과(I-01·I-02)로 표시한다. */
export function CourseNearbyFacilities({
  candidateName,
  courseId,
  revNo,
}: CourseNearbyFacilitiesProps) {
  const query = useCourseNearby(courseId, { revNo });
  const title = candidateName ? `${candidateName} 주변 시설` : '주변 시설';

  if (query.isPending) {
    return (
      <section aria-label="주변 시설 정보" className="nearby-facilities insights-panel">
        <div className="insights-empty" role="status">
          주변 시설을 불러오고 있어요.
        </div>
      </section>
    );
  }

  if (query.isError) {
    const message = errorMessage(query.error);
    return (
      <section aria-label="주변 시설 정보" className="nearby-facilities insights-panel">
        <div className="insights-empty" role="alert">
          <strong>{message.title}</strong>
          <p>{message.description}</p>
          <Button onClick={() => void query.refetch()} size="sm" variant="secondary">
            다시 시도
          </Button>
        </div>
      </section>
    );
  }

  const summary = query.data;
  const hasData = summary.facilityDataAvailable || summary.spotDataAvailable;

  return (
    <section aria-label="주변 시설 정보" className="nearby-facilities insights-panel">
      {/* 피그마 '코스 탐색 결과 - 주변 시설': 제목 왼쪽, 검색 기준 오른쪽 */}
      <header className="insights-panel__heading">
        <div>
          <h2>{`${title} ${summary.facilities}곳`}</h2>
        </div>
        <p className="insights-note">{`경로 반경 ${summary.radiusM}m · 거리순`}</p>
      </header>

      {summary.places.length === 0 ? (
        <div className="insights-empty" role="status">
          {hasData ? (
            <>
              <strong>표시할 시설이 없어요</strong>
              <p>{`코스 경로 반경 ${summary.radiusM}m 안에 화장실·주차장·쉼터가 없어요.`}</p>
            </>
          ) : (
            <>
              <strong>시설 자료가 아직 없어요</strong>
              <p>이 산의 시설 자료가 준비되지 않아 주변 시설을 확인할 수 없어요.</p>
            </>
          )}
        </div>
      ) : (
        <ul aria-label="코스 주변 시설" className="nearby-facilities__list">
          {summary.places.map((place) => (
            <li key={place.key}>
              <Card className="nearby-facility-card" padding="md">
                <div className="nearby-facility-card__heading">
                  <h3>{place.name}</h3>
                </div>
                <p>
                  {KIND_LABELS[place.kind]} · {formatDistance(place.distanceM)}
                </p>
                <NearbyPlaceDetails place={place} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
