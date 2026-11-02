import mountainPhoto from '@/assets/home/mountain-background.png';
import { Badge } from '@/components/ui/Badge';

import type { MountainListItem } from '../types/mountain';
import { MountainSearchBar } from './MountainSearchBar';

import './mountain-select.css';

export interface MountainSelectionPanelProps {
  hasError: boolean;
  isLoading: boolean;
  mountains: MountainListItem[];
  onClearSearch: () => void;
  onMountainSelect: (mountain: MountainListItem | null) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  page: number;
  searchQuery: string;
  selectionError: string | null;
  selectedMountain: MountainListItem | null;
  totalElements: number;
  totalPages: number;
}

function getMountainLocation(mountain: MountainListItem) {
  const address =
    mountain.addressLabel?.trim() ||
    [mountain.provinceName, mountain.districtName].filter(Boolean).join(' ');
  const elevation =
    mountain.elevationMeters === null ? '' : `${mountain.elevationMeters.toLocaleString('ko-KR')}m`;

  return [address, elevation].filter(Boolean).join(' · ');
}

export function MountainSelectionPanel({
  hasError,
  isLoading,
  mountains,
  onClearSearch,
  onMountainSelect,
  onPageChange,
  onRetry,
  onSearchChange,
  page,
  searchQuery,
  selectionError,
  selectedMountain,
  totalElements,
  totalPages,
}: MountainSelectionPanelProps) {
  return (
    <section
      aria-label="산 선택"
      className="mountain-selection"
      onKeyDown={(event) => {
        if (
          event.key === 'Escape' &&
          selectedMountain &&
          !(event.target instanceof HTMLInputElement)
        ) {
          onMountainSelect(null);
        }
      }}
    >
      <header className="mountain-selection__intro">
        <p className="mountain-selection__eyebrow">MOUNTAIN EXPLORER</p>
        <h1>어느 산으로 갈까요?</h1>
        <p className="mountain-selection__description">
          원하는 산을 선택하면 코스를 탐색할 수 있어요.
        </p>
        <MountainSearchBar onSearchChange={onSearchChange} searchQuery={searchQuery} />
      </header>

      <div className="mountain-selection__results-heading">
        <h2>
          산 목록 <span>{totalElements}</span>
        </h2>
        <span className="mountain-selection__data-note">
          {totalPages > 0 ? `${page + 1} / ${totalPages} 페이지` : '서비스 대상 산'}
        </span>
      </div>

      {isLoading ? (
        <div className="mountain-selection__empty" role="status">
          <p>산 목록을 불러오는 중이에요.</p>
        </div>
      ) : hasError ? (
        <div className="mountain-selection__empty" role="alert">
          <p>산 목록을 불러오지 못했어요.</p>
          <span>잠시 후 다시 시도해 주세요.</span>
          <button onClick={onRetry} type="button">
            다시 시도
          </button>
        </div>
      ) : mountains.length > 0 ? (
        <div aria-label="산 목록" className="mountain-selection__list">
          {mountains.map((mountain) => {
            const isSelected = selectedMountain?.mountainId === mountain.mountainId;
            const location = getMountainLocation(mountain);

            return (
              <button
                aria-pressed={isSelected}
                className={`mountain-card${isSelected ? ' is-selected' : ''}`}
                key={mountain.mountainId}
                onClick={() => onMountainSelect(isSelected ? null : mountain)}
                type="button"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="mountain-card__photo"
                  src={mountainPhoto}
                />
                <span className="mountain-card__body">
                  <span className="mountain-card__title-row">
                    <strong>{mountain.mountainName}</strong>
                    {mountain.mountainName === '관악산' ? (
                      <Badge className="mountain-card__recommend" variant="primary">
                        추천
                      </Badge>
                    ) : null}
                  </span>
                  {location ? <span className="mountain-card__location">{location}</span> : null}
                </span>
                <span aria-hidden="true" className="mountain-card__selection">
                  {isSelected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mountain-selection__empty" role="status">
          <p>검색 결과가 없어요.</p>
          <span>다른 산 이름으로 검색해 보세요.</span>
          <button onClick={onClearSearch} type="button">
            검색 초기화
          </button>
        </div>
      )}

      {!isLoading && !hasError && totalPages > 1 ? (
        <nav aria-label="산 목록 페이지" className="mountain-selection__pagination">
          <button disabled={page <= 0} onClick={() => onPageChange(page - 1)} type="button">
            이전
          </button>
          <span aria-live="polite">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            다음
          </button>
        </nav>
      ) : null}

      <div
        aria-live="polite"
        className="mountain-selection__selection-status"
        role={selectionError ? 'alert' : 'status'}
      >
        {selectionError ? (
          <>
            <span>{selectionError}</span>
            <button onClick={() => onMountainSelect(null)} type="button">
              선택 취소
            </button>
          </>
        ) : selectedMountain ? (
          <>
            <span>선택한 산: {selectedMountain.mountainName}</span>
            <button onClick={() => onMountainSelect(null)} type="button">
              선택 취소
            </button>
          </>
        ) : (
          <span>산을 선택하지 않았습니다.</span>
        )}
      </div>
    </section>
  );
}
