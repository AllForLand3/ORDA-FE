import { useEffect, useRef } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';

import { Button, Card } from '@/components/ui';
import type { ApiErrorResponse } from '@/shared/types/api';

import type { CourseNearbySummary, NearbyPlace, NearbyPlaceKind } from '../hooks/useCourseNearby';

import { NearbyPlaceDetails } from './NearbyPlaceDetails';

const KIND_LABELS: Record<NearbyPlaceKind, string> = {
  TOILET: '화장실',
  PARKING: '주차장',
  SHELTER: '쉼터',
};

interface CourseNearbyFacilitiesProps {
  candidateName: string | null;
  /** 코스(useCourseNearby) 또는 경로 후보(useRouteNearby) 주변 조회 결과. */
  query: UseQueryResult<CourseNearbySummary>;
  /** 지도와 함께 선택된 항목 key. 지도 마커를 누르면 바뀌고, 해당 카드를 강조·스크롤한다. */
  selectedKey?: string | null;
  /** 위치가 있는 항목 이름을 누르면 호출한다. 페이지에서 지도를 그 위치로 옮긴다. */
  onSelectPlace?: (place: NearbyPlace) => void;
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

/** 결과가 없을 때, 확인한 자료와 확인하지 못한 자료를 구분해 안내한다. */
function emptyMessage(summary: CourseNearbySummary): { title: string; description: string } {
  const radius = `코스 경로 반경 ${summary.radiusM}m 안에`;
  if (summary.facilityDataAvailable && summary.spotDataAvailable) {
    return { title: '표시할 시설이 없어요', description: `${radius} 화장실·주차장·쉼터가 없어요.` };
  }
  if (summary.facilityDataAvailable) {
    return {
      title: '표시할 시설이 없어요',
      description: `${radius} 화장실·주차장이 없어요. 쉼터 자료는 확인할 수 없어요.`,
    };
  }
  if (summary.spotDataAvailable) {
    return {
      title: '표시할 시설이 없어요',
      description: `${radius} 쉼터가 없어요. 화장실·주차장 자료는 확인할 수 없어요.`,
    };
  }
  return {
    title: '시설 자료가 아직 없어요',
    description: '이 산의 시설 자료가 준비되지 않아 주변 시설을 확인할 수 없어요.',
  };
}

/** 실제 코스·경로 후보의 주변 화장실·주차장·쉼터를 BE 조회 결과로 표시한다. */
export function CourseNearbyFacilities({
  candidateName,
  query,
  selectedKey = null,
  onSelectPlace,
}: CourseNearbyFacilitiesProps) {
  const title = candidateName ? `${candidateName} 주변 시설` : '주변 시설';
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  // 지도에서 고른 항목이 목록 밖에 있으면 보이도록 스크롤한다.
  useEffect(() => {
    if (selectedKey) itemRefs.current.get(selectedKey)?.scrollIntoView({ block: 'nearest' });
  }, [selectedKey]);

  if (query.isPending) {
    return (
      <section aria-label="주변 시설 정보" className="nearby-facilities insights-panel">
        <div className="insights-empty" role="status">
          {query.fetchStatus === 'idle'
            ? '주변 시설 조회 조건을 확인할 수 없어요.'
            : '주변 시설을 불러오고 있어요.'}
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
  const empty = emptyMessage(summary);

  return (
    <section aria-label="주변 시설 정보" className="nearby-facilities insights-panel">
      {/* 피그마 '코스 탐색 결과 - 주변 시설': 제목 왼쪽, 검색 기준 오른쪽 */}
      <header className="insights-panel__heading">
        <div>
          <h2>{summary.facilities === null ? title : `${title} ${summary.facilities}곳`}</h2>
        </div>
        {/* 거리는 출발점부터가 아니라 경로선에서 떨어진 거리이므로 기준을 함께 적는다. */}
        <p className="insights-note">{`경로 반경 ${summary.radiusM}m · 경로에서 가까운 순`}</p>
      </header>

      {summary.places.length > 0 &&
      (!summary.facilityDataAvailable || !summary.spotDataAvailable) ? (
        <p className="insights-note" role="status">
          일부 자료를 확인하지 못해 목록이 주변 시설 전체가 아닐 수 있어요.
        </p>
      ) : null}

      {summary.places.length === 0 ? (
        <div className="insights-empty" role="status">
          <strong>{empty.title}</strong>
          <p>{empty.description}</p>
        </div>
      ) : (
        <ul aria-label="코스 주변 시설" className="nearby-facilities__list">
          {summary.places.map((place) => (
            <li
              key={place.key}
              ref={(element) => {
                if (element) itemRefs.current.set(place.key, element);
                else itemRefs.current.delete(place.key);
              }}
            >
              <Card
                className={`nearby-facility-card${place.key === selectedKey ? ' is-selected' : ''}`}
                padding="md"
              >
                <div className="nearby-facility-card__heading">
                  {/* 위치가 있는 항목만 이름을 눌러 지도에서 찾을 수 있다. */}
                  <h3>
                    {place.coordinates && onSelectPlace ? (
                      <button
                        aria-pressed={place.key === selectedKey}
                        className="nearby-facility-card__locate"
                        onClick={() => onSelectPlace(place)}
                        title="지도에서 위치 보기"
                        type="button"
                      >
                        {place.name}
                      </button>
                    ) : (
                      place.name
                    )}
                  </h3>
                </div>
                <p>
                  {KIND_LABELS[place.kind]} · 경로에서 {formatDistance(place.distanceM)}
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
