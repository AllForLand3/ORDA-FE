export interface MountainSearchParams {
  keyword?: string;
  page?: number;
  size?: number;
  minLng?: number;
  minLat?: number;
  maxLng?: number;
  maxLat?: number;
}

export interface MountainListItem {
  mountainId: string;
  mountainName: string;
  addressLabel: string | null;
  provinceName: string | null;
  districtName: string | null;
  elevationMeters: number | null;
  geometry: PointGeometry | null;
}

export interface MountainDetail {
  mountainId: string;
  mountainName: string;
  sourceMountainCode: string | null;
  sourceOldMountainCode: string | null;
  serviceAvailable: boolean;
  addressLabel: string | null;
  provinceName: string | null;
  districtName: string | null;
  elevationMeters: number | null;
  geometry: PointGeometry | null;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** API 공간 좌표는 EPSG:4326의 [경도, 위도] 순서를 사용한다. */
export type LongitudeLatitude = [longitude: number, latitude: number];

export interface PointGeometry {
  type: 'Point';
  coordinates: LongitudeLatitude;
}

export interface ServiceAreaGeometry {
  type: 'MultiPolygon';
  coordinates: LongitudeLatitude[][][];
}

export interface ServiceAreaProperties {
  areaId: number;
  areaName: string;
  mountainId: number;
  datasetId: number;
}

export interface ServiceAreaFeature {
  type: 'Feature';
  id: number;
  geometry: ServiceAreaGeometry;
  properties: ServiceAreaProperties;
}

export interface ServiceAreaFeatureCollection {
  type: 'FeatureCollection';
  features: ServiceAreaFeature[];
}

export type ImportMountain = Pick<MountainListItem, 'mountainId' | 'mountainName'>;
export type ImportMountainPage = PageResponse<MountainListItem>;
