import { useMemo } from 'react';

import mountainPhoto from '@/assets/home/mountain-background.png';
import { Badge } from '@/components/ui/Badge';

import { MOUNTAIN_MOCKS } from '../mocks/mountains';
import type { MountainDifficulty, MountainRegion, MountainSummary } from '../mocks/mountains';

import './mountain-select.css';

export type MountainSort = 'popularity' | 'elevation';

export interface MountainSelectionPanelProps {
  difficulty: MountainDifficulty | '전체';
  filtersExpanded: boolean;
  onClearFilters: () => void;
  onDifficultyChange: (difficulty: MountainDifficulty | '전체') => void;
  onMountainSelect: (mountainId: string | null) => void;
  onRegionChange: (region: MountainRegion | '전체') => void;
  onSortChange: (sort: MountainSort) => void;
  region: MountainRegion | '전체';
  searchQuery: string;
  selectedMountainId: string | null;
  sort: MountainSort;
}

const REGIONS: readonly (MountainRegion | '전체')[] = ['전체', '서울', '경기'];
const DIFFICULTIES: readonly (MountainDifficulty | '전체')[] = ['전체', '초중급', '중급'];

function matchesQuery(mountain: MountainSummary, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    mountain.name,
    mountain.region,
    mountain.district,
    `${mountain.elevationMeters}m`,
    ...mountain.tags,
  ]
    .join(' ')
    .toLocaleLowerCase('ko-KR');

  return searchableText.includes(normalizedQuery);
}

export function MountainSelectionPanel({
  difficulty,
  filtersExpanded,
  onClearFilters,
  onDifficultyChange,
  onMountainSelect,
  onRegionChange,
  onSortChange,
  region,
  searchQuery,
  selectedMountainId,
  sort,
}: MountainSelectionPanelProps) {
  const mountains = useMemo(() => {
    const filtered = MOUNTAIN_MOCKS.filter(
      (mountain) =>
        matchesQuery(mountain, searchQuery) &&
        (region === '전체' || mountain.region === region) &&
        (difficulty === '전체' || mountain.difficulty === difficulty),
    );

    return [...filtered].sort((first, second) =>
      sort === 'popularity'
        ? first.popularity - second.popularity
        : second.elevationMeters - first.elevationMeters,
    );
  }, [difficulty, region, searchQuery, sort]);

  const selectedMountain = MOUNTAIN_MOCKS.find((mountain) => mountain.id === selectedMountainId);

  return (
    <section
      aria-label="산 선택"
      className="mountain-selection"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selectedMountainId) {
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
      </header>

      <div aria-label="지역 필터" className="mountain-selection__filters" role="group">
        {REGIONS.map((item) => (
          <button
            aria-pressed={region === item}
            className={`mountain-selection__chip${region === item ? ' is-active' : ''}`}
            key={item}
            onClick={() => onRegionChange(item)}
            type="button"
          >
            {item === '전체' ? (
              <>
                <svg aria-hidden="true" viewBox="0 0 16 16">
                  <path d="m1.5 12 4-7 2.5 4 2-3 4.5 6h-13Z" />
                </svg>
                전체
              </>
            ) : (
              item
            )}
          </button>
        ))}
        <label className="mountain-selection__sort">
          <span className="sr-only">산 정렬</span>
          <select
            aria-label="산 정렬"
            onChange={(event) => onSortChange(event.currentTarget.value as MountainSort)}
            value={sort}
          >
            <option value="popularity">인기순</option>
            <option value="elevation">높은 산순</option>
          </select>
        </label>
      </div>

      <div
        aria-label="난이도 필터"
        className="mountain-selection__advanced-filters"
        hidden={!filtersExpanded}
        id="mountain-advanced-filters"
        role="group"
      >
        <span>난이도</span>
        {DIFFICULTIES.map((item) => (
          <button
            aria-pressed={difficulty === item}
            className={`mountain-selection__chip mountain-selection__chip--small${difficulty === item ? ' is-active' : ''}`}
            key={item}
            onClick={() => onDifficultyChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mountain-selection__results-heading">
        <h2>
          산 목록 <span>{mountains.length}</span>
        </h2>
        <span className="mountain-selection__data-note">화면 확인용 예시 데이터</span>
      </div>

      {mountains.length > 0 ? (
        <div aria-label="산 목록" className="mountain-selection__list">
          {mountains.map((mountain) => {
            const isSelected = selectedMountainId === mountain.id;

            return (
              <button
                aria-pressed={isSelected}
                className={`mountain-card${isSelected ? ' is-selected' : ''}`}
                key={mountain.id}
                onClick={() => onMountainSelect(isSelected ? null : mountain.id)}
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
                    <strong>{mountain.name}</strong>
                    {mountain.id === 'gwanaksan' ? (
                      <Badge className="mountain-card__recommend" variant="primary">
                        추천
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mountain-card__location">
                    {mountain.region} {mountain.district} · {mountain.elevationMeters}m
                  </span>
                  <span className="mountain-card__tags">
                    <span className="mountain-card__difficulty">{mountain.difficulty}</span>
                    {mountain.tags.map((tag) => (
                      <span className="mountain-card__tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </span>
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
          <span>검색어나 지역·난이도 조건을 바꿔 보세요.</span>
          <button onClick={onClearFilters} type="button">
            검색과 필터 초기화
          </button>
        </div>
      )}

      <div aria-live="polite" className="mountain-selection__selection-status" role="status">
        {selectedMountain ? (
          <>
            <span>선택한 산: {selectedMountain.name}</span>
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
