import type { ChangeEvent } from 'react';

import { TextField } from '@/components/ui/TextField';

export interface MountainSearchBarProps {
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export function MountainSearchBar({ onSearchChange, searchQuery }: MountainSearchBarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.currentTarget.value);
  };

  return (
    <div className="mountain-selection__search">
      <TextField
        className="mountain-selection__search-input"
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
