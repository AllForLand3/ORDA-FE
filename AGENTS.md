# ORDA Frontend AI 작업 지침

AI CLI가 이 저장소에서 작업할 때 따르는 규칙이다. 세부 규칙은 `docs/`의 각 문서를 따르고, 이 문서와 충돌하면 이 문서가 우선한다.

## 1. 프로젝트

- 서비스: ORDA. 지도에서 산과 등산 코스를 탐색하고, 조건에 맞는 경로 후보를 비교하고, 고도·경사 분석 결과를 보여준다. MVP 대상은 관악산이다.
- 이 저장소는 화면과 지도 표현을 담당한다. API, 공간 연산, 경로 탐색, 인증·인가는 Backend 책임이다.

## 2. 기술 스택

| 구분      | 기술                                                    |
| --------- | ------------------------------------------------------- |
| 기본      | React 19, TypeScript, Vite (Next.js 아님)               |
| 지도·차트 | OpenLayers, ECharts                                     |
| 목표 스택 | pnpm, React Router, TanStack Query, Axios, Tailwind CSS |

- 현재 코드는 목표 스택 일부(npm, fetch, 일반 CSS)로 되어 있을 수 있다. 실제 `package.json`과 코드를 먼저 확인한다.
- 목표 스택으로의 전환, shadcn/ui 등 새 라이브러리 도입은 개발자 승인 후에만 한다.

## 3. 구조

```
src/
├── main.tsx         Vite 진입점
├── app/             라우터(router.tsx), 전역 Provider, 최상위 App
├── pages/           라우트 단위 화면. features를 조합만 한다
├── features/
│   ├── map/         [공용] OpenLayers 지도 생성·해제, VWorld 배경, 레이어
│   ├── course/      [1조] 산·코스 탐색, 내 코스 등록·수정·삭제
│   ├── route/       [2조] 출발·도착·조건 선택, 경로 후보 비교·저장·내보내기
│   ├── analysis/    [3조] 고도 프로파일, 경사·지점 분석 표시
│   └── auth/        인증 방식 확정 후 작성
│   (각 기능 안: api/, components/, hooks/, types/)
├── components/      도메인을 모르는 공통 UI (layout/, ui/)
├── lib/             axios, queryClient, OpenLayers 투영 등 기술 설정
├── shared/          공통 constants, hooks, types (GeoJSON, 오류 응답)
├── assets/          fonts/, icons/
└── styles/          전역 스타일
```

- 모든 폴더를 미리 만들지 않는다. 요청된 기능에 필요한 것만 만든다.
- `features/`끼리 서로 직접 import하지 않는다. 함께 써야 하면 `shared/`로 옮기거나 `pages/`에서 조합한다.
- 다른 조의 `features/` 폴더를 수정해야 하면 먼저 보고한다.
- OpenLayers `Map` 객체는 `features/map`에서만 생성·해제한다. 다른 기능은 레이어를 추가·제거하는 훅을 통해 쓴다.

## 4. 실행과 검증

```bash
npm install          # pnpm 전환 후에는 pnpm install
npm run dev          # http://localhost:5173, /api → localhost:8080 프록시
npm run build        # 타입 검사 + 빌드
npm run test:e2e     # Playwright (API 모킹)
```

- 변경 범위에 맞게 빌드와 테스트를 실행한다. 타입 오류를 `any`나 단언으로 숨기지 않는다.
- 실행하지 못한 검증은 실행하지 못했다고 보고한다.

## 5. 현재 기준 (변경 시 BE와 합의)

- API 좌표는 GeoJSON, EPSG:4326, 경도·위도 순서. 지도 화면은 EPSG:3857.
- 좌표 변환은 GeoJSON을 읽고 쓰는 지점에서 한 번만 한다. 데이터 투영과 화면 투영을 항상 명시한다.
- 경로 선형은 서버가 준 순서와 방향을 유지한다. 경로 없음, 스냅 실패, 분석 결측을 임의 도형이나 수치로 채우지 않는다.
- 거리(m), 고도(m), 경사(%)는 API 단위를 유지하고 화면에 단위를 표시한다.
- 오류 응답은 `{ "status", "code", "message" }`. `status`는 HTTP 상태 코드와 같은 값으로 확인용이며, 화면 분기는 `code` 기준으로 한다.
- 비밀정보를 번들에 넣지 않는다. 예외: VWorld API 키는 브라우저에서 써야 하므로 `VITE_VWORLD_KEY`로 두되, 도메인 제한이 걸린 키만 쓴다.

## 6. 미확정 사항

아래 항목은 임의로 정하지 말고 개발자에게 묻는다. 결정되면 이 목록에서 지우고 5장 또는 `docs/`에 옮긴다.

- 목표 스택(pnpm, React Router, TanStack Query, Axios, Tailwind) 전환 시점, shadcn/ui 사용 여부
- 인증 방식과 로그인 화면 흐름
- 경로 API의 요청·응답 필드 (현재 뼈대는 노드 ID 입력, 목표는 지도 좌표 선택)
- 배경지도 전환 (현재 OSM, 목표 VWorld)
- 반응형 기준 (데스크톱 우선 / 모바일 대응 범위)

## 7. 작업 원칙

1. 작업 전 관련 코드와 문서를 읽고 현재 구현을 기준으로 판단한다.
2. 요청 범위에 필요한 최소 변경만 한다. 사용자의 기존 변경을 되돌리거나 덮어쓰지 않는다.
3. 확인되지 않은 API, 환경 변수, 화면 정책, 파일 경로를 만들어 확정하지 않는다.
4. 서버 상태는 TanStack Query(도입 전에는 기존 방식)로, 화면 상태는 가장 가까운 컴포넌트에 둔다. 파생 가능한 값을 상태로 중복 저장하지 않는다.
5. 지도 이벤트 리스너, 오버레이, ECharts 인스턴스는 컴포넌트 해제 시 정리한다.
6. 로딩, 빈 결과, 오류, 비활성 상태를 화면에 표시한다.

## 8. 금지 사항

- 명시적 요청 없는 `commit`, `push`, 강제 푸시, 이력 재작성, 브랜치 삭제
- 검증 통과를 위한 테스트 삭제·비활성화, 타입 검사 우회
- API 계약과 좌표 의미를 추측해 변경
- 요청과 무관한 일괄 포맷팅이나 리팩터링

## 9. 완료 보고

한국어로 간결하게 쓴다.

```
변경 파일:
핵심 동작:
실행한 검증: (명령과 결과. 못 한 것은 못 했다고)
남은 위험·확인 필요:
```

## 10. 참고 문서

- 구조와 흐름: `docs/architecture.md`
- React 구현: `docs/frontend-convention.md`
- HTTP 계약: `docs/api-convention.md`
- 좌표·지도 표현: `docs/gis-convention.md`
- 테스트: `docs/testing-convention.md`
- Git: `docs/git-convention.md`
