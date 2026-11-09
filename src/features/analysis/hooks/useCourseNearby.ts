import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAccessToken } from '@/shared/hooks/useAccessToken';

import { getCourseFacilities, getCourseSpots } from '../api/nearby';
import type { GeoJsonPosition } from '@/shared/types/geojson';

import type {
  CourseNearbyParams,
  NearbyFacilitiesGroup,
  NearbySpotsGroup,
  PointGeometry,
} from '../types/nearby';

/** 주변 조회 기본 반경(m). BE 기본값과 같다. */
export const DEFAULT_NEARBY_RADIUS_M = 200;

export type NearbyPlaceKind = 'TOILET' | 'PARKING' | 'SHELTER';

/** 주변 시설 탭에 표시하는 항목. 화면에서는 화장실·주차장(시설)과 쉼터(상세지점)를 함께 보여 준다. */
export interface NearbyPlace {
  key: string;
  kind: NearbyPlaceKind;
  /** 화장실·주차장의 BE 시설 ID. 쉼터(상세지점)는 null이다. */
  facilityId: string | null;
  name: string;
  address: string | null;
  /** 산림청 상세지점 원본 메모. 시설은 null이다. */
  memo: string | null;
  distanceM: number;
  /** EPSG:4326 [경도, 위도]. 위치가 없거나 잘못되면 null이며 지도에 표시하지 않는다. */
  coordinates: GeoJsonPosition | null;
}

/** 개수는 해당 자료가 없으면(dataAvailable=false) 0이 아니라 null이다. */
export interface CourseNearbySummary {
  radiusM: number;
  stairs: number | null;
  toilet: number | null;
  parking: number | null;
  shelter: number | null;
  /** 피그마 기준 주변 시설 수 = 화장실 + 주차장 + 쉼터. 하나라도 자료가 없으면 null */
  facilities: number | null;
  facilityDataAvailable: boolean;
  spotDataAvailable: boolean;
  places: NearbyPlace[];
}

export const nearbyQueryKeys = {
  course: (
    courseId: string,
    params: CourseNearbyParams,
    userId: string | undefined,
    token: string | null,
  ) =>
    ['analysis', 'course-nearby', userId, token, courseId, params.revNo, params.radiusM] as const,
};

/** BE 코스 ID(양의 정수 문자열)인지 확인한다. 예시 코스 ID는 조회하지 않는다. */
export function isServerCourseId(courseId: string | null | undefined): courseId is string {
  return (
    typeof courseId === 'string' &&
    /^\d+$/.test(courseId) &&
    BigInt(courseId) > 0n &&
    BigInt(courseId) <= 9223372036854775807n
  );
}

/** 지도 투영(EPSG:3857)이 표현할 수 있는 위도 범위. useCourseLayer와 같은 기준이다. */
const MAX_MAP_LATITUDE = 85.0511287798066;

/** 응답 Point 좌표가 지도에 그릴 수 있는 [경도, 위도]일 때만 반환한다. 결측을 임의 위치로 채우지 않는다. */
function lonLat(geometry: PointGeometry | null | undefined): GeoJsonPosition | null {
  if (geometry?.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
  const [longitude, latitude] = geometry.coordinates;
  return Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    Math.abs(longitude) <= 180 &&
    Math.abs(latitude) <= MAX_MAP_LATITUDE
    ? [longitude, latitude]
    : null;
}

/** 상세지점·시설 조회 결과를 화면용 요약으로 정리한다. 코스(I-01·I-02)와 경로 후보 조회가 함께 쓴다. */
export function toNearbySummary(
  radiusM: number,
  spots: NearbySpotsGroup,
  facilities: NearbyFacilitiesGroup,
): CourseNearbySummary {
  // 자료가 있는데 키가 없으면 0곳, 자료 자체가 없으면 결측(null)으로 둔다.
  const toilet = facilities.dataAvailable ? (facilities.counts.TOILET ?? 0) : null;
  const parking = facilities.dataAvailable ? (facilities.counts.PARKING ?? 0) : null;
  const shelter = spots.dataAvailable ? (spots.counts.REST ?? 0) : null;

  const places: NearbyPlace[] = [
    ...(facilities.dataAvailable ? facilities.items : []).map((item) => ({
      key: `facility-${item.facilityId}`,
      kind: item.type,
      facilityId: item.facilityId,
      name: item.name ?? (item.type === 'TOILET' ? '이름 없는 화장실' : '이름 없는 주차장'),
      address: item.address,
      memo: null,
      distanceM: item.distanceM,
      coordinates: lonLat(item.geometry),
    })),
    // 산림청 지점은 이름이 없어 원본 분류명(예: 벤치)을 이름으로 쓰고 메모는 상세에 둔다.
    // 원본 분류 '기타'는 이름으로 의미가 없으므로 시설 유형명(쉼터)으로 표시한다.
    ...(spots.dataAvailable ? spots.items : [])
      .filter((item) => item.tags.some((tag) => tag.tag === 'REST'))
      .map((item) => ({
        key: `spot-${item.spotId}`,
        kind: 'SHELTER' as const,
        facilityId: null,
        name: item.sourceClass && item.sourceClass !== '기타' ? item.sourceClass : '쉼터',
        address: null,
        memo: item.detail,
        distanceM: item.distanceM,
        coordinates: lonLat(item.geometry),
      })),
  ].sort((a, b) => a.distanceM - b.distanceM || a.key.localeCompare(b.key));

  return {
    radiusM,
    stairs: spots.dataAvailable ? (spots.counts.STAIR ?? 0) : null,
    toilet,
    parking,
    shelter,
    facilities:
      toilet === null || parking === null || shelter === null ? null : toilet + parking + shelter,
    facilityDataAvailable: facilities.dataAvailable,
    spotDataAvailable: spots.dataAvailable,
    places,
  };
}

/** 코스 주변 상세지점(I-01)·시설(I-02)을 함께 조회해 화면용 요약으로 정리한다. */
export function useCourseNearby(
  courseId: string | null | undefined,
  params: CourseNearbyParams = {},
  userId?: string,
) {
  const token = useAccessToken();
  const requestParams = { revNo: params.revNo, radiusM: params.radiusM ?? DEFAULT_NEARBY_RADIUS_M };
  const enabled = Boolean(
    userId &&
    token &&
    isServerCourseId(courseId) &&
    Number.isInteger(requestParams.revNo) &&
    (requestParams.revNo ?? 0) > 0 &&
    Number.isInteger(requestParams.radiusM) &&
    requestParams.radiusM >= 1 &&
    requestParams.radiusM <= 500,
  );

  return useQuery({
    queryKey: nearbyQueryKeys.course(enabled ? (courseId ?? '') : '', requestParams, userId, token),
    queryFn: async ({ signal }) => {
      if (!isServerCourseId(courseId)) {
        throw new Error('조회할 수 없는 코스 ID입니다.');
      }
      const [spots, facilities] = await Promise.all([
        getCourseSpots(courseId, requestParams, signal),
        getCourseFacilities(courseId, requestParams, signal),
      ]);
      if (
        [spots, facilities].some(
          (response) =>
            response.courseId !== courseId ||
            response.revNo !== requestParams.revNo ||
            response.radiusM !== requestParams.radiusM,
        )
      ) {
        throw new Error('주변 정보의 응답 조건이 요청과 일치하지 않습니다.');
      }
      return toNearbySummary(facilities.radiusM, spots, facilities);
    },
    enabled,
    staleTime: 60 * 1000,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: retryNearby,
  });
}

/** 400·404·409 같은 요청 오류는 다시 보내도 결과가 같으므로 재시도하지 않는다. */
export function retryNearby(failureCount: number, error: Error): boolean {
  return (
    !(axios.isAxiosError(error) && error.response && error.response.status < 500) &&
    failureCount < 1
  );
}
