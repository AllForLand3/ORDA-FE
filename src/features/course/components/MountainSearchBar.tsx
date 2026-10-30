import type { ChangeEvent } from 'react';

import filterIcon from '@/assets/icons/filter.svg';
import { IconButton } from '@/components/ui/IconButton';
import { TextField } from '@/components/ui/TextField';

export interface MountainSearchBarProps {
  filtersExpanded: boolean;
  onFilterToggle: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export function MountainSearchBar({
  filtersExpanded,
  onFilterToggle,
  onSearchChange,
  searchQuery,
}: MountainSearchBarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.currentTarget.value);
  };

  return (
    <div className="mountain-selection__search">
      <TextField
        className="mountain-selection__search-input"
        endAdornment={
          <IconButton
            aria-controls="mountain-advanced-filters"
            aria-expanded={filtersExpanded}
            aria-label={filtersExpanded ? '추가 필터 닫기' : '추가 필터 열기'}
            className="mountain-selection__search-filter"
            onClick={onFilterToggle}
            size="sm"
          >
            <img alt="" aria-hidden="true" src={filterIcon} />
          </IconButton>
        }
        hideLabel
        label="산 이름 검색"
        onChange={handleSearchChange}
        placeholder="산 이름을 검색해 보세요"
        value={searchQuery}
        variant="search"
      />
    </div>
  );
}
