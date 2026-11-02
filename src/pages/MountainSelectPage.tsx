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
  useMountainMarkerLayer,
  useMountainsQuery,
} from '@/features/course';
import type { MountainListItem } from '@/features/course';

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
  const markerLayer = useMountainMarkerLayer(mountains, selectedMountain?.mountainId ?? null);
  const additionalLayers = useMemo(() => [markerLayer], [markerLayer]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setKeyword(searchQuery.trim()), 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(0);
    setSelectedMountain(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setKeyword('');
    setPage(0);
    setSelectedMountain(null);
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
      mapControls={<MapControls controller={mapController} />}
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
          selectedMountain={selectedMountain}
          totalElements={mountainsQuery.data?.totalElements ?? 0}
          totalPages={mountainsQuery.data?.totalPages ?? 0}
        />
      }
      panelFooter={
        <Button
          disabled={!selectedMountain}
          fullWidth
          onClick={() =>
            navigate(`/routes/setup?mountainId=${encodeURIComponent(selectedMountain!.mountainId)}`)
          }
          size="lg"
        >
          코스 탐색 설정
        </Button>
      }
      panelLabel="산 선택 패널"
      mobilePanelResizable
      panelSize="content"
    />
  );
}
