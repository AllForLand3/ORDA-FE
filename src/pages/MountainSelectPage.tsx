import { useMemo, useRef, useState } from 'react';

import { MapPageLayout } from '@/components/layout/MapPageLayout';
import { MapControls, OpenLayersMap } from '@/features/map';
import type { MapController } from '@/features/map';
import {
  DEFAULT_MOUNTAIN_ID,
  MOUNTAIN_MOCKS,
  MountainBottomNavigation,
  MountainSearchBar,
  MountainSelectionPanel,
  useMountainMarkerLayer,
} from '@/features/course';
import type { MountainDifficulty, MountainRegion, MountainSort } from '@/features/course';

import './MountainSelectPage.css';

export function MountainSelectPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapController, setMapController] = useState<MapController | null>(null);
  const [selectedMountainId, setSelectedMountainId] = useState<string | null>(DEFAULT_MOUNTAIN_ID);
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState<MountainRegion | '전체'>('전체');
  const [difficulty, setDifficulty] = useState<MountainDifficulty | '전체'>('전체');
  const [sort, setSort] = useState<MountainSort>('popularity');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const markerLayer = useMountainMarkerLayer(selectedMountainId);
  const additionalLayers = useMemo(() => [markerLayer], [markerLayer]);
  const initialMountain = MOUNTAIN_MOCKS.find((mountain) => mountain.id === DEFAULT_MOUNTAIN_ID);

  const handleMountainSelect = (mountainId: string | null) => {
    const nextMountainId = mountainId === selectedMountainId ? null : mountainId;
    setSelectedMountainId(nextMountainId);

    const mountain = MOUNTAIN_MOCKS.find((item) => item.id === nextMountainId);

    if (mountain) {
      mapController?.centerOn(mountain.coordinates, 10);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRegion('전체');
    setDifficulty('전체');
    setSort('popularity');
  };

  return (
    <MapPageLayout
      bottomNavigation={<MountainBottomNavigation />}
      bottomNavigationLabel="산 선택 화면 내비게이션"
      header={
        <MountainSearchBar
          filtersExpanded={filtersExpanded}
          onFilterToggle={() => setFiltersExpanded((isExpanded) => !isExpanded)}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
        />
      }
      mapContainerRef={mapContainerRef}
      mapContent={
        <OpenLayersMap
          additionalLayers={additionalLayers}
          initialCenter={initialMountain?.coordinates ?? null}
          initialZoom={10}
          onControllerChange={setMapController}
          targetRef={mapContainerRef}
        />
      }
      mapControls={<MapControls controller={mapController} />}
      mapLabel="산 선택 지도"
      panel={
        <MountainSelectionPanel
          difficulty={difficulty}
          filtersExpanded={filtersExpanded}
          onClearFilters={clearFilters}
          onDifficultyChange={setDifficulty}
          onMountainSelect={handleMountainSelect}
          onRegionChange={setRegion}
          onSortChange={setSort}
          region={region}
          searchQuery={searchQuery}
          selectedMountainId={selectedMountainId}
          sort={sort}
        />
      }
      panelLabel="산 선택 패널"
      panelSize="content"
    />
  );
}
