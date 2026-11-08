import { useState } from 'react';

import { useFacilitySource } from '../hooks/useFacilitySource';
import type { NearbyPlace } from '../hooks/useCourseNearby';

/** 상세지점(쉼터)은 모두 산림청 등산로 상세지점 자료다. */
const SPOT_PROVIDER = '산림청';

function formatDistance(distanceM: number): string {
  return `${distanceM.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}m`;
}

interface NearbyPlaceDetailsProps {
  place: NearbyPlace;
}

/** 주변 시설 카드의 상세 펼침. 시설 출처는 펼쳤을 때 시설 상세(I-04)로 조회한다. */
export function NearbyPlaceDetails({ place }: NearbyPlaceDetailsProps) {
  const [open, setOpen] = useState(false);
  const source = useFacilitySource(place.facilityId, open);

  const provider =
    place.facilityId === null
      ? SPOT_PROVIDER
      : source.isPending
        ? '불러오는 중'
        : source.isError
          ? '확인하지 못했어요'
          : (source.data ?? '미제공');

  const rows = [
    // 쉼터(상세지점)는 주소가 없고 원본 메모가 있어 항목이 다르다.
    place.kind === 'SHELTER'
      ? { label: '원본 메모', value: place.memo ?? '미제공' }
      : { label: '주소', value: place.address ?? '미제공' },
    { label: '선택 코스와의 거리', value: formatDistance(place.distanceM) },
    { label: '출처', value: provider },
  ];

  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>시설 상세 보기</summary>
      <dl>
        {rows.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
