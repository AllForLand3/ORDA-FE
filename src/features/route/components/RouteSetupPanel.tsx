import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import beginnerIcon from '@/assets/route/level-beginner.svg';
import intermediateIcon from '@/assets/route/level-intermediate.svg';
import experiencedIcon from '@/assets/route/level-experienced.svg';
import gpsIcon from '@/assets/icons/gps.svg';
import flagIcon from '@/assets/route/flag.svg';

import { useRouteSetupState } from '../hooks/useRouteSetupState';
import {
  ROUTE_DIFFICULTIES,
  ROUTE_FACILITIES,
  ROUTE_PLACE_MOCKS,
  ROUTE_PRIORITIES,
} from '../mocks/route-setup';
import type { RoutePointRole } from '../mocks/route-setup';

type RouteSetupState = ReturnType<typeof useRouteSetupState>;

export interface RouteSetupPanelProps {
  state: RouteSetupState;
}

const STEP_NUMBER = { locations: 1, difficulty: 2, conditions: 3 } as const;
const LEVEL_ICONS = {
  beginner: beginnerIcon,
  intermediate: intermediateIcon,
  experienced: experiencedIcon,
};

function getRoleLabel(role: RoutePointRole) {
  return role === 'origin' ? '출발지' : '도착지';
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 25 25">
      <circle cx="10.75" cy="10.75" r="5.75" stroke="currentColor" strokeWidth="1.75" />
      <path d="m15 15 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}

function MapPickIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 21s6-5.35 6-11a6 6 0 1 0-12 0c0 5.65 6 11 6 11Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="10" r="2.15" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function PlaceConfirmation({
  place,
  role,
  state,
}: {
  place: NonNullable<RouteSetupState['pendingPlace']>;
  role: RoutePointRole;
  state: RouteSetupState;
}) {
  return (
    <div aria-live="polite" className="route-setup-confirm" role="group">
      <p className="route-setup-confirm__question">
        이 {place.source === 'map' ? '위치' : '예시 장소'}를 {getRoleLabel(role)}로 설정할까요?
      </p>
      <strong>{place.name}</strong>
      <span>{place.address}</span>
      <div className="route-setup-confirm__actions">
        <Button onClick={state.cancelPending} size="sm" variant="secondary">
          취소
        </Button>
        <Button onClick={state.confirmPlace} size="sm">
          {getRoleLabel(role)}로 설정
        </Button>
      </div>
    </div>
  );
}

export function RouteSetupPanel({ state }: RouteSetupPanelProps) {
  const chosenIds = new Set([state.origin?.id, state.destination?.id].filter(Boolean));
  const results = ROUTE_PLACE_MOCKS.filter((place) => {
    const query = state.query.trim().toLocaleLowerCase();
    return !query || `${place.name} ${place.address}`.toLocaleLowerCase().includes(query);
  });

  return (
    <div className="route-setup-panel">
      <div className="route-setup-panel__topline">
        <span className="route-setup-panel__eyebrow">ROUTE FINDER</span>
        <span
          aria-label={`${STEP_NUMBER[state.step]}단계 / 3단계`}
          className="route-setup-panel__step-count"
        >
          {STEP_NUMBER[state.step]} / 3
        </span>
      </div>

      {state.step === 'locations' ? (
        <section aria-labelledby="route-setup-title">
          <h1 className="route-setup-panel__title" id="route-setup-title">
            출발지와 도착지
          </h1>
          <p className="route-setup-panel__description">지도에서 위치를 선택하거나 검색해보세요.</p>

          <div className="route-setup-locations">
            {(['origin', 'destination'] as const).map((role) => {
              const place = role === 'origin' ? state.origin : state.destination;
              const isSearching = state.searchRole === role;

              return (
                <div className="route-setup-location" key={role}>
                  <div className="route-setup-location__row">
                    <button
                      aria-expanded={isSearching}
                      className={`route-setup-location__select route-setup-location__select--${role}${place ? ' route-setup-location__select--selected' : ''}`}
                      onClick={() => state.openSearch(role)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`route-setup-location__icon route-setup-location__icon--${role}`}
                      >
                        <span
                          className="route-setup-location__icon-image"
                          style={{ maskImage: `url("${flagIcon}")` }}
                        />
                      </span>

                      <span className="route-setup-location__text">
                        <span className="route-setup-location__label">{getRoleLabel(role)}</span>
                        <strong>{place?.name ?? `${getRoleLabel(role)}를 검색해주세요`}</strong>
                        {place?.source === 'map' ? (
                          <small className="route-setup-location__source">지도에서 직접 선택</small>
                        ) : null}
                      </span>
                      <span aria-hidden="true" className="route-setup-location__action">
                        <SearchIcon />
                      </span>
                    </button>
                    <div className="route-setup-location__actions">
                      <Button
                        aria-label={`${getRoleLabel(role)} 지도에서 선택`}
                        className="route-setup-location__map-select"
                        onClick={() => state.beginMapSelection(role)}
                        size="sm"
                        variant="secondary"
                      >
                        <MapPickIcon />
                      </Button>
                    </div>
                  </div>

                  {isSearching ? (
                    <div
                      aria-label={`${getRoleLabel(role)} 검색 패널`}
                      className="route-setup-search"
                      role="region"
                    >
                      {state.isMapSelectionMode ? (
                        <div className="route-setup-map-select-panel">
                          {state.pendingPlace ? (
                            <PlaceConfirmation
                              place={state.pendingPlace}
                              role={role}
                              state={state}
                            />
                          ) : (
                            <div className="route-setup-map-select-panel__status">
                              <img alt="" aria-hidden="true" src={gpsIcon} />
                              <p role="status">지도를 눌러 {getRoleLabel(role)}를 선택해주세요.</p>
                            </div>
                          )}
                          <div className="route-setup-confirm__actions">
                            <Button
                              aria-label="장소 검색으로 전환"
                              onClick={() => state.openSearch(role)}
                              size="sm"
                              variant="secondary"
                            >
                              장소 검색
                            </Button>
                            <Button
                              aria-label="지도 선택 닫기"
                              className="route-setup-map-select-panel__close"
                              onClick={state.closeSearch}
                              size="sm"
                              variant="quiet"
                            >
                              <span aria-hidden="true">×</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="route-setup-search__toolbar">
                            <TextField
                              autoComplete="off"
                              hideLabel
                              label={`${getRoleLabel(role)} 검색`}
                              onChange={(event) => state.setQuery(event.target.value)}
                              placeholder={`${getRoleLabel(role)} 검색`}
                              type="search"
                              value={state.query}
                              variant="search"
                            />
                            <Button
                              aria-label="장소 검색 닫기"
                              className="route-setup-search__close"
                              onClick={state.closeSearch}
                              size="sm"
                              variant="quiet"
                            >
                              <span aria-hidden="true">×</span>
                            </Button>
                          </div>

                          {state.pendingPlace ? (
                            <PlaceConfirmation
                              place={state.pendingPlace}
                              role={role}
                              state={state}
                            />
                          ) : results.length ? (
                            <ul
                              aria-label="예시 장소 검색 결과"
                              className="route-setup-search__results"
                            >
                              {results.map((place) => {
                                const alreadyChosen = chosenIds.has(place.id);

                                return (
                                  <li key={place.id}>
                                    <button
                                      className="route-setup-search-result"
                                      disabled={alreadyChosen}
                                      onClick={() => state.choosePlace(place, role)}
                                      type="button"
                                    >
                                      <img
                                        alt=""
                                        aria-hidden="true"
                                        className="route-setup-search-result__pin"
                                        src={gpsIcon}
                                      />
                                      <span>
                                        <strong>{place.name}</strong>
                                        <small>
                                          {alreadyChosen ? '다른 항목에 선택됨' : place.address}
                                        </small>
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="route-setup-search__empty" role="status">
                              검색 결과가 없어요.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {state.step === 'difficulty' ? (
        <section aria-labelledby="route-setup-title">
          <h1 className="route-setup-panel__title" id="route-setup-title">
            나의 등산 수준
          </h1>
          <p className="route-setup-panel__description">코스 탐색에 참고할 수준을 선택해주세요.</p>
          <div aria-label="등산 수준" className="route-setup-difficulties" role="radiogroup">
            {ROUTE_DIFFICULTIES.map((item) => (
              <label
                className={`route-setup-difficulty${state.difficulty === item.id ? ' route-setup-difficulty--selected' : ''}`}
                key={item.id}
              >
                <input
                  checked={state.difficulty === item.id}
                  name="route-difficulty"
                  onChange={() => state.setDifficulty(item.id)}
                  type="radio"
                  value={item.id}
                />
                <img
                  alt=""
                  aria-hidden="true"
                  className="route-setup-difficulty__mark"
                  src={LEVEL_ICONS[item.id]}
                />
                <span className="route-setup-difficulty__copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <span aria-hidden="true" className="route-setup-difficulty__radio" />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {state.step === 'conditions' ? (
        <section aria-labelledby="route-setup-title">
          <h1 className="route-setup-panel__title" id="route-setup-title">
            어떤 코스를 원하시나요?
          </h1>
          <p className="route-setup-panel__description">
            코스 탐색 기준과 비교 정보를 선택해주세요.
          </p>

          <fieldset className="route-setup-condition-group">
            <legend>
              탐색 기준 <small>(경로 탐색에 반영돼요)</small>
            </legend>
            <div className="route-setup-priorities">
              {ROUTE_PRIORITIES.map((item, index) => {
                const selected = state.priorities.includes(item.id);

                return (
                  <button
                    aria-pressed={selected}
                    className={`route-setup-priority${selected ? ' route-setup-priority--selected' : ''}`}
                    key={item.id}
                    onClick={() => state.togglePriority(item.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="route-setup-priority__icon">
                      {index === 0 ? '↗' : index === 1 ? '⌁' : '▤'}
                    </span>
                    <span aria-hidden="true" className="route-setup-priority__check">
                      {selected ? '✓' : '○'}
                    </span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="route-setup-condition-group route-setup-condition-group--facilities">
            <legend>
              비교 정보 <small>(결과에서 확인할 수 있어요)</small>
            </legend>
            <div className="route-setup-facilities">
              {ROUTE_FACILITIES.map((item) => {
                const selected = state.facilities.includes(item.id);

                return (
                  <button
                    aria-pressed={selected}
                    className={`route-setup-facility${selected ? ' route-setup-facility--selected' : ''}`}
                    key={item.id}
                    onClick={() => state.toggleFacility(item.id)}
                    type="button"
                  >
                    <span aria-hidden="true">{selected ? '✓' : '○'}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>
      ) : null}
    </div>
  );
}

export interface RouteSetupFooterProps {
  state: RouteSetupState;
}

export function RouteSetupFooter({ state }: RouteSetupFooterProps) {
  if (state.step === 'locations') {
    return (
      <div className="route-setup-footer">
        <Button
          aria-describedby="route-setup-next-help"
          disabled={!state.canContinueFromLocations}
          fullWidth
          onClick={() => state.setStep('difficulty')}
          size="lg"
        >
          다음 <span aria-hidden="true">→</span>
        </Button>
        <span className="route-setup-footer__help sr-only" id="route-setup-next-help">
          출발지와 도착지를 각각 선택하면 다음 단계로 갈 수 있어요.
        </span>
      </div>
    );
  }

  return (
    <div className="route-setup-footer route-setup-footer--split">
      <Button
        className="route-setup-footer__back"
        onClick={() => state.setStep(state.step === 'conditions' ? 'difficulty' : 'locations')}
        size="lg"
        variant="secondary"
      >
        <span aria-hidden="true">←</span> 이전
      </Button>
      {state.step === 'difficulty' ? (
        <Button
          className="route-setup-footer__next"
          onClick={() => state.setStep('conditions')}
          size="lg"
        >
          다음 <span aria-hidden="true">→</span>
        </Button>
      ) : (
        <Button
          aria-describedby="route-setup-recommendation-note"
          className="route-setup-footer__next"
          disabled
          size="lg"
        >
          맞춤 경로 탐색하기
        </Button>
      )}
      {state.step === 'conditions' ? (
        <span
          className="route-setup-footer__recommendation-note"
          id="route-setup-recommendation-note"
          role="note"
        >
          실제 경로 추천 기능은 아직 연결되지 않았어요.
        </span>
      ) : null}
    </div>
  );
}
