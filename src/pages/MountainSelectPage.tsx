import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MapPageLayout } from '@/components/layout/MapPageLayout';
import { Button } from '@/components/ui/Button';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import {
  MountainBottomNavigation,
  MountainHeader,
  MountainSelectionPanel,
  useMountainDetailQuery,
  useMountainMarkerLayer,
  useMountainsQuery,
} from '@/features/course';
import type { MountainListItem } from '@/features/course';
import { getApiErrorCode } from '@/lib/apiError';

import './MountainSelectPage.css';

const EMPTY_MOUNTAINS: MountainListItem[] = [];
const MOUNTAINS_PAGE_SIZE = 10;

export function MountainSelectPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapController, setMapController] = useState<MapController | null>(null);
  const [selectedMountain, setSelectedMountain] = useState<MountainListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const mountainsQuery = useMountainsQuery({
    keyword: keyword || undefined,
    page,
    size: MOUNTAINS_PAGE_SIZE,
  });
  const mountains = mountainsQuery.data?.items ?? EMPTY_MOUNTAINS;
  const mountainDetailQuery = useMountainDetailQuery(selectedMountain?.mountainId ?? null);
  const mountainDetail = mountainDetailQuery.data ?? null;
  const markerLayer = useMountainMarkerLayer(mountains, mountainDetail ?? selectedMountain);
  const additionalLayers = useMemo(() => [markerLayer], [markerLayer]);
  const mountainDetailErrorCode = getApiErrorCode(mountainDetailQuery.error);
  const mountainDetailError = mountainDetailQuery.isError
    ? mountainDetailErrorCode === 'MOUNTAIN_NOT_FOUND'
      ? '선택한 산 정보를 찾을 수 없어요.'
      : '산 상세 정보를 불러오지 못했어요.'
    : null;
  const courseSetupStatus =
    selectedMountain && mountainDetailQuery.isPending
      ? '산 정보를 확인하는 중이에요.'
      : mountainDetail && !mountainDetail.serviceAvailable
        ? '현재 코스 탐색 서비스를 제공하지 않는 산이에요.'
        : null;

  useEffect(() => {
    const nextKeyword = searchQuery.trim();
    const timeoutId = window.setTimeout(() => {
      if (nextKeyword === keyword) {
        return;
      }

      setKeyword(nextKeyword);
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [keyword, searchQuery]);

  useEffect(() => {
    if (mountainDetail?.geometry) {
      mapController?.centerOn(mountainDetail.geometry.coordinates, 14);
    }
  }, [mapController, mountainDetail]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setKeyword('');
    setPage(0);
  };

  const handleMountainSelect = (mountain: MountainListItem | null) => {
    setSelectedMountain(mountain);

    if (mountain?.geometry) {
      mapController?.centerOn(mountain.geometry.coordinates, 14);
    }
  };

  return (
    <MapPageLayout
      bottomNavigation={<MountainBottomNavigation />}
      bottomNavigationLabel="산 선택 화면 내비게이션"
      header={<MountainHeader />}
      mapContainerRef={mapContainerRef}
      mapContent={
        <OpenLayersMap
          additionalLayers={additionalLayers}
          initialZoom={10}
          onControllerChange={setMapController}
          targetRef={mapContainerRef}
        />
      }
      mapControls={
        <MapControls
          controller={mapController}
          mountainName={mountainDetail?.mountainName ?? selectedMountain?.mountainName}
        />
      }
      mapLabel="산 선택 지도"
      panel={
        <MountainSelectionPanel
          hasError={mountainsQuery.isError}
          isLoading={mountainsQuery.isPending}
          mountains={mountains}
          onClearSearch={clearSearch}
          onMountainSelect={handleMountainSelect}
          onPageChange={setPage}
          onRetry={() => {
            void mountainsQuery.refetch();
          }}
          onSearchChange={handleSearchChange}
          page={mountainsQuery.data?.page ?? page}
          searchQuery={searchQuery}
          selectionError={mountainDetailError}
          selectedMountain={selectedMountain}
          totalElements={mountainsQuery.data?.totalElements ?? 0}
          totalPages={mountainsQuery.data?.totalPages ?? 0}
        />
      }
      panelFooter={
        <div className="mountain-select__footer">
          {courseSetupStatus ? (
            <p aria-live="polite" role="status">
              {courseSetupStatus}
            </p>
          ) : null}
          <Button
            disabled={
              !selectedMountain || mountainDetailQuery.isError || !mountainDetail?.serviceAvailable
            }
            fullWidth
            onClick={() => {
              if (selectedMountain) {
                navigate(
                  `/routes/setup?mountainId=${encodeURIComponent(selectedMountain.mountainId)}`,
                );
              }
            }}
            size="lg"
          >
            코스 탐색 설정
          </Button>
        </div>
      }
      panelLabel="산 선택 패널"
      mobilePanelResizable
      panelSize="content"
    />
  );
}
