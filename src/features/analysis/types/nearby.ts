// BE I-01·I-02 응답 계약(ORDA-BE#41)을 그대로 옮긴 타입이다.
// 좌표는 GeoJSON EPSG:4326 [경도, 위도], 거리는 코스와의 평면 최단거리(m)다.

export type VerifyStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
export type FacilityType = 'TOILET' | 'PARKING';
export type LocationBasis = 'SOURCE_COORD' | 'GEOCODE' | 'FIELD';

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface SpotTag {
  tag: string;
  verifyStatus: VerifyStatus;
  extractType: string;
}

export interface NearbySpot {
  spotId: string;
  sourceClass: string | null;
  detail: string | null;
  distanceM: number;
  matchDistanceM: number | null;
  verifyStatus: VerifyStatus;
  tags: SpotTag[];
  geometry: PointGeometry;
}

export interface NearbySpotsResponse {
  courseId: string;
  revNo: number;
  radiusM: number;
  dataAvailable: boolean;
  counts: Record<string, number>;
  items: NearbySpot[];
}

export interface NearbyFacility {
  facilityId: string;
  type: FacilityType;
  name: string | null;
  address: string | null;
  distanceM: number;
  locationBasis: LocationBasis;
  verifyStatus: VerifyStatus;
  geometry: PointGeometry;
}

export interface NearbyFacilitiesResponse {
  courseId: string;
  revNo: number;
  radiusM: number;
  dataAvailable: boolean;
  counts: Partial<Record<FacilityType, number>>;
  items: NearbyFacility[];
}

export interface CourseNearbyParams {
  revNo?: number;
  radiusM?: number;
}

/** 코스·후보 주변 조회에서 공통으로 쓰는 상세지점·시설 결과 묶음. */
export type NearbySpotsGroup = Pick<NearbySpotsResponse, 'dataAvailable' | 'counts' | 'items'>;
export type NearbyFacilitiesGroup = Pick<
  NearbyFacilitiesResponse,
  'dataAvailable' | 'counts' | 'items'
>;

/** BE 경로 탐색 후보 주변 조회 요청(ORDA-BE#49). edgeIds는 경로 탐색 응답 후보 값이다. */
export interface RouteNearbyRequest {
  mountainId: string;
  edgeIds: string[];
  radiusM?: number;
}

/** spots는 I-01, facilities는 I-02와 같은 기준의 결과다. */
export interface RouteNearbyResponse {
  mountainId: string;
  radiusM: number;
  spots: NearbySpotsGroup;
  facilities: NearbyFacilitiesGroup;
}

/** BE I-04 시설 상세 응답 중 화면에서 쓰는 출처 정보. */
export interface FacilitySource {
  datasetId: string;
  datasetName: string | null;
  provider: string | null;
  baseDate: string | null;
  collectDate: string | null;
}

export interface FacilityDetailResponse {
  facilityId: string;
  type: FacilityType;
  name: string | null;
  address: string | null;
  source: FacilitySource;
}
