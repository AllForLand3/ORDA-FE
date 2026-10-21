import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import logoMark from '@/assets/home/logo-mark.png';
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
    <div className="mountain-explorer-header">
      <Link aria-label="ORDA 홈으로 이동" className="mountain-explorer-header__brand" to="/">
        <img alt="" aria-hidden="true" src={logoMark} />
      </Link>
      <TextField
        className="mountain-explorer-header__input"
        endAdornment={
          <IconButton
            aria-controls="mountain-advanced-filters"
            aria-expanded={filtersExpanded}
            aria-label={filtersExpanded ? '추가 필터 닫기' : '추가 필터 열기'}
            className="mountain-explorer-header__filter"
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
      <nav aria-label="주요 메뉴" className="mountain-explorer-header__navigation">
        <Link aria-current="page" to="/mountains">
          산 탐색
        </Link>
        <Link to="/routes/setup">맞춤 경로</Link>
        <Link to="/my-courses">내 코스</Link>
      </nav>
      <Link
        aria-label="마이페이지로 이동"
        className="mountain-explorer-header__account"
        to="/my-page"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 20c.5-3.45 2.8-5.25 6.5-5.25s6 1.8 6.5 5.25" />
        </svg>
        <span>마이페이지</span>
      </Link>
    </div>
  );
}
