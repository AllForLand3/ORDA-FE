import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

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

export type RouteSetupStep = 'locations' | 'difficulty' | 'conditions';

function readTokenList<T extends string>(value: string | null, allowed: readonly { id: T }[]) {
  const valid = new Set(allowed.map((item) => item.id));

  return (value ?? '').split(',').filter((token): token is T => valid.has(token as T));
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

  return {
    step,
    origin,
    destination,
    pendingPlace,
    searchRole,
    isMapSelectionMode,
    query,
    difficulty,
    priorities,
    facilities,
    canContinueFromLocations: Boolean(origin && destination && origin.id !== destination.id),
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
      if (!pendingPlace || !searchRole) return;

      update((next) => {
        next.set(searchRole, pendingPlace.id);
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
