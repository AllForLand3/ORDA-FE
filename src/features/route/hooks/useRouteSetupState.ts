import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ROUTE_MVP_MOUNTAIN_ID } from '../constants';

import {
  ROUTE_DIFFICULTIES,
  ROUTE_FACILITIES,
  ROUTE_PLACE_MOCKS,
  ROUTE_PRIORITIES,
} from '../mocks/route-setup';
import type {
  RouteCoordinate,
  RouteDifficulty,
  RouteFacility,
  RoutePlace,
  RoutePointRole,
  RoutePriority,
} from '../mocks/route-setup';
import { useRouteSnap } from './useRouteSnap';

export type RouteSetupStep = 'locations' | 'difficulty' | 'conditions';

function readTokenList<T extends string>(value: string | null, allowed: readonly { id: T }[]) {
  const valid = new Set(allowed.map((item) => item.id));

  return (value ?? '').split(',').filter((token): token is T => valid.has(token as T));
}

const NODE_PARAM = { origin: 'originNode', destination: 'destinationNode' } as const;

function readNodeId(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getPlace(id: string | null): RoutePlace | null {
  const mock = ROUTE_PLACE_MOCKS.find((place) => place.id === id);
  if (mock) return mock;
  if (!id?.startsWith('map:')) return null;

  const [longitude, latitude] = id.slice(4).split(',').map(Number);
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return {
    id,
    name: '지도에서 선택한 위치',
    address: '사용자 지정 위치 · 주소 정보 없음',
    coordinates: [longitude, latitude],
    source: 'map',
  };
}

export function useRouteSetupState() {
  const [params, setParams] = useSearchParams();
  const stepParam = params.get('step');
  const step: RouteSetupStep =
    stepParam === 'difficulty' || stepParam === 'conditions' ? stepParam : 'locations';
  const originId = params.get('origin');
  const destinationId = params.get('destination');
  const pendingId = params.get('pending');
  const origin = useMemo(() => getPlace(originId), [originId]);
  const destination = useMemo(() => getPlace(destinationId), [destinationId]);
  const pendingPlace = useMemo(() => getPlace(pendingId), [pendingId]);
  // 확정한 장소에 연결된 등산로 노드 ID다. 장소 없이 남은 노드 ID는 쓰지 않는다.
  const originNodeId = origin ? readNodeId(params.get(NODE_PARAM.origin)) : null;
  const destinationNodeId = destination ? readNodeId(params.get(NODE_PARAM.destination)) : null;
  const mountainId = ROUTE_MVP_MOUNTAIN_ID;
  const pendingSnap = useRouteSnap(mountainId, pendingPlace?.coordinates ?? null);
  // 확정한 지점의 스냅 위치 표시용이다. 노드에 연결된 지점만 조회하고, 확인 단계와 같은 캐시를 써서
  // 새로고침했을 때만 다시 요청한다. 탐색에 쓰는 노드 ID는 URL 값이 기준이다.
  const originSnap = useRouteSnap(mountainId, origin && originNodeId ? origin.coordinates : null);
  const destinationSnap = useRouteSnap(
    mountainId,
    destination && destinationNodeId ? destination.coordinates : null,
  );
  const isSameNode = Boolean(
    originNodeId && destinationNodeId && originNodeId === destinationNodeId,
  );
  const hasBothNodes = Boolean(origin && destination && originNodeId && destinationNodeId);
  const canSearch = hasBothNodes && !isSameNode && origin?.id !== destination?.id;
  const searchFor = params.get('searchFor');
  const searchRole: RoutePointRole | null =
    searchFor === 'origin' || searchFor === 'destination' ? searchFor : null;
  const query = params.get('q') ?? '';
  const isMapSelectionMode = params.get('mapSelect') === 'true';
  const levelParam = params.get('level');
  const difficulty = ROUTE_DIFFICULTIES.some((item) => item.id === levelParam)
    ? (levelParam as RouteDifficulty)
    : 'beginner';
  const priorities = params.has('priorities')
    ? readTokenList<RoutePriority>(params.get('priorities'), ROUTE_PRIORITIES)
    : (['distance', 'fewer-stairs'] satisfies RoutePriority[]);
  const facilities = params.has('facilities')
    ? readTokenList<RouteFacility>(params.get('facilities'), ROUTE_FACILITIES)
    : (['restroom', 'shelter'] satisfies RouteFacility[]);

  const update = (mutate: (next: URLSearchParams) => void, replace = true) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        mutate(next);
        return next;
      },
      { replace },
    );
  };

  const searchParams = new URLSearchParams(params);
  for (const key of [
    'step',
    'searchFor',
    'pending',
    'q',
    'mapSelect',
    'preview',
    'tab',
    'candidate',
  ]) {
    searchParams.delete(key);
  }
  if (canSearch && originNodeId && destinationNodeId) {
    searchParams.set('mountainId', mountainId);
    searchParams.set('startNodeId', originNodeId);
    searchParams.set('endNodeId', destinationNodeId);
  }

  return {
    step,
    mountainId,
    origin,
    destination,
    originNodeId,
    destinationNodeId,
    pendingPlace,
    pendingSnap,
    originSnap,
    destinationSnap,
    isSameNode,
    searchRole,
    isMapSelectionMode,
    query,
    difficulty,
    priorities,
    facilities,
    // 두 지점이 모두 등산로 노드에 연결되고 서로 다른 노드일 때만 진행한다 (Backend ROUTE_SAME_POINT와 같은 기준).
    canContinueFromLocations: canSearch,
    canSearch,
    // 탐색 API에는 산·노드 ID만 보낸다. 수준·탐색 기준·비교 정보는 화면 상태로만 URL에 남는다.
    searchHref: canSearch ? `/routes/results?${searchParams}` : null,
    setStep: (nextStep: RouteSetupStep) => update((next) => next.set('step', nextStep), false),
    openSearch: (role: RoutePointRole) =>
      update((next) => {
        next.set('searchFor', role);
        next.delete('pending');
        next.delete('q');
        next.delete('mapSelect');
      }),
    beginMapSelection: (role: RoutePointRole) =>
      update((next) => {
        next.set('searchFor', role);
        next.set('mapSelect', 'true');
        next.delete('pending');
        next.delete('q');
      }),
    setPendingCoordinate: (role: RoutePointRole, coordinate: RouteCoordinate) => {
      const [longitude, latitude] = coordinate;
      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        return;
      }

      update((next) => {
        next.set('searchFor', role);
        next.set('mapSelect', 'true');
        next.set('pending', `map:${longitude.toFixed(6)},${latitude.toFixed(6)}`);
      });
    },
    setQuery: (value: string) =>
      update((next) => {
        if (value) next.set('q', value);
        else next.delete('q');
      }),
    choosePlace: (place: RoutePlace, role: RoutePointRole) =>
      update((next) => {
        next.set('searchFor', role);
        next.set('pending', place.id);
        next.delete('mapSelect');
      }),
    confirmPlace: () => {
      // 등산로 노드에 연결된(스냅 성공) 장소만 확정한다.
      if (!pendingPlace || !searchRole || !pendingSnap.isSuccess) return;
      const { nodeId } = pendingSnap.data;

      update((next) => {
        next.set(searchRole, pendingPlace.id);
        next.set(NODE_PARAM[searchRole], nodeId);
        next.delete('pending');
        next.delete('searchFor');
        next.delete('q');
        next.delete('mapSelect');
      });
    },
    cancelPending: () => update((next) => next.delete('pending')),
    closeSearch: () =>
      update((next) => {
        next.delete('searchFor');
        next.delete('pending');
        next.delete('q');
        next.delete('mapSelect');
      }),
    clearPlace: (role: RoutePointRole) =>
      update((next) => {
        next.delete(role);
        next.delete(NODE_PARAM[role]);
        next.delete('searchFor');
        next.delete('pending');
        next.delete('q');
        next.delete('mapSelect');
      }),
    setDifficulty: (value: RouteDifficulty) => update((next) => next.set('level', value)),
    togglePriority: (value: RoutePriority) =>
      update((next) => {
        const selected = readTokenList<RoutePriority>(next.get('priorities'), ROUTE_PRIORITIES);
        const result = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];
        if (result.length) next.set('priorities', result.join(','));
        else next.delete('priorities');
      }),
    toggleFacility: (value: RouteFacility) =>
      update((next) => {
        const selected = readTokenList<RouteFacility>(next.get('facilities'), ROUTE_FACILITIES);
        const result = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];
        if (result.length) next.set('facilities', result.join(','));
        else next.delete('facilities');
      }),
  };
}
