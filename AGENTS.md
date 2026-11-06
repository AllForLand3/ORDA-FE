# ORDA Frontend AI 작업 지침

AI CLI가 이 저장소에서 작업할 때 따르는 규칙이다. 세부 규칙은 `docs/`의 각 문서를 따르고, 이 문서와 충돌하면 이 문서가 우선한다. 작업 시점의 코드·Git 상태와 Backend 계약을 우선 확인한다.

## 1. 프로젝트

- 서비스: ORDA. 지도에서 산과 등산 코스를 탐색하고, 조건에 맞는 경로 후보를 비교하고, 고도·경사 분석 결과를 보여준다. MVP 대상은 관악산이다.
- 이 저장소는 화면과 지도 표현을 담당한다. API 구현, 공간 연산, 경로 탐색 계산, 인증·인가의 최종 검증은 Backend 책임이다.

## 2. 기술 스택

| 구분 | 기술 |
| --- | --- |
| 기본 | React 19, TypeScript, Vite (Next.js 아님) |
| 지도·차트 | OpenLayers, ECharts |
| 표준 스택 | pnpm, React Router, TanStack Query, Axios, Tailwind CSS |

- 실제 `package.json`과 코드를 먼저 확인한다. shadcn/ui 등 신규 라이브러리 도입은 개발자 승인 후에만 한다.

## 3. 구조

```text
src/
├── main.tsx         Vite 진입점
├── app/             라우터(router.tsx), 전역 Provider, 최상위 App
├── pages/           라우트 단위 화면, 여러 feature 조합
├── features/
│   ├── map/         [공용] OpenLayers 지도 생성·해제, 배경지도, 레이어
│   ├── course/      [1조] 산·코스 조회, 내 코스 등록·수정·삭제
│   ├── route/       [2조] 출발·도착·조건 선택, 경로 후보 비교·저장·내보내기
│   ├── analysis/    [3조] 고도 프로파일, 지형·시설 분석 표시
│   └── auth/        로그인·회원정보·JWT 인증 상태
│   (각 기능 안: api/, components/, hooks/, types/ 등 필요한 폴더만)
├── components/      도메인을 모르는 공통 UI (layout/, ui/)
├── lib/             Axios, queryClient 등 기술 설정
├── shared/          공통 constants, hooks, types
├── assets/          이미지, 글꼴, 아이콘
└── styles/          전역 스타일
```

- 모든 폴더를 미리 만들지 않는다. 요청된 기능에 필요한 것만 만든다.
- `features/`끼리 서로 직접 import하지 않는다. 함께 써야 하면 `shared/`로 옮기거나 `pages/`에서 조합한다.
- 다른 조의 `features/` 폴더를 수정해야 하면 수정 근거와 범위를 완료 보고에 명시한다.
- OpenLayers `Map` 객체는 `features/map`에서만 생성·해제한다. 다른 기능은 레이어를 추가·제거하는 훅을 통해 사용한다.

## 4. 실행과 검증

```bash
pnpm install
pnpm dev             # 기본 http://localhost:5173
pnpm typecheck
pnpm lint
pnpm build           # 타입 검사 + Vite 빌드
pnpm test:e2e        # Playwright; 다수 테스트는 API 모킹
```

- 로컬 개발 프록시는 현재 `vite.config.ts`의 `/api` 설정과 `http://localhost:8080/orda-api` target을 기준으로 확인한다. 이미 실제 연동에 사용 중인 설정을 임의로 `rewrite`하거나 변경하지 않는다. 실제 요청 URL과 응답은 Network 또는 curl로 검증한다.
- 변경 범위에 맞게 빌드와 테스트를 실행한다. 타입 오류를 `any`나 단언으로 숨기지 않는다.
- 실행하지 못한 검증은 실행하지 못했다고 보고한다. 빌드 성공은 실제 Backend 연동 성공을 의미하지 않는다.

## 5. 현재 기준 (변경 시 BE와 합의)

- API 좌표는 GeoJSON, EPSG:4326, `[경도, 위도]` 순서. 지도 화면은 EPSG:3857이다.
- 좌표 변환은 GeoJSON을 읽고 쓰는 지점에서 필요한 만큼 정확히 수행한다. 입력 좌표를 재변환하거나 좌표 순서를 뒤집지 않는다.
- 경로 선형은 서버가 준 순서와 방향을 유지한다. 경로 없음, 스냅 실패, 분석 결측을 임의 도형이나 수치로 채우지 않는다.
- 거리(m), 고도(m), 경사(%)는 API 단위를 유지하고 화면에 단위를 표시한다.
- 오류 응답은 `status`, `code`, `message`를 기준으로 처리한다. HTTP 상태와 오류 코드를 구분하고 서버 내부 예외를 노출하지 않는다.
- 2D 배경지도는 현재 공통 지도 구현을 유지한다. 지도 유형 전환·컨트롤을 통합 중 삭제하지 않는다.
- 기존 JWT Bearer 인증과 Axios 401 처리, 사용자 전환 시 데이터 격리를 유지한다.
- 산·코스 식별자는 응답 계약에 맞게 **문자열로 유지**한다. 큰 ID를 JavaScript `number`로 변환하지 않는다.
- 코스 수정·삭제는 Backend의 ETag/`If-Match` 동시성 계약을 확인한다. 충돌 시 사용자의 변경을 자동으로 덮어쓰지 않는다.
- 비밀정보를 번들에 넣지 않는다. VWorld API 키가 필요한 경우 도메인 제한이 적용된 `VITE_VWORLD_KEY`만 사용한다.

## 6. 미확정 사항

아래 항목은 임의로 확정하지 않고, 현재 구현과 문서를 확인한 뒤 필요한 경우 선택지와 영향을 보고한다.

- shadcn/ui 사용 여부
- 경로 계산 API의 세부 요청·응답 계약과 좌표 선택 흐름
- 검색·정렬·필터 중 Backend 미지원 기능의 최종 UX 정책
- 향후 형상 편집(꼭짓점 추가·이동·삭제)의 구현 범위

## 7. 작업 원칙

1. 작업 전 관련 코드와 문서를 읽고 현재 구현을 기준으로 판단한다.
2. 요청 범위에 필요한 최소 변경만 한다. 사용자의 기존 변경을 되돌리거나 덮어쓰지 않는다.
3. 확인되지 않은 API, 환경 변수, 화면 정책, 파일 경로를 만들어 확정하지 않는다.
4. 서버 상태는 TanStack Query로, 화면 상태는 가장 가까운 컴포넌트에 둔다. 파생 가능한 값을 상태로 중복 저장하지 않는다.
5. 지도 이벤트 리스너, 오버레이, ECharts 인스턴스는 컴포넌트 해제 시 정리한다.
6. 로딩, 빈 결과, 오류, 비활성 상태를 화면에 표시한다.
7. 테스트를 통과시키기 위해 실제 API 응답을 Mock으로 몰래 대체하거나 기존 기능을 삭제하지 않는다.

## 8. 금지 사항

- 명시적 요청 없는 `commit`, `push`, 강제 푸시, 이력 재작성, 브랜치 삭제, GitHub PR 머지
- 검증 통과를 위한 테스트 삭제·비활성화, 타입 검사 우회
- API 계약과 좌표 의미를 추측해 변경
- 요청과 무관한 일괄 포맷팅이나 리팩터링
- `.env`, 비밀정보, DB·BE 코드 및 스키마, CI/CD, lockfile의 승인 없는 변경

## 9. 완료 보고

한국어로 간결하고 구체적으로 쓴다.

```text
기준 브랜치/HEAD 및 병합 기준:
충돌 파일과 해결 방법:
변경 파일과 핵심 동작:
보존한 dev / #19 / #16 기능:
검증: PASS / FAIL / 미실행(이유):
남은 위험·결정 필요 사항:
커밋·푸시·PR 머지 여부:
```

## 10. 참고 문서

- 구조와 흐름: `docs/architecture.md`
- React 구현: `docs/frontend-convention.md`
- HTTP 계약: `docs/api-convention.md`
- 좌표·지도 표현: `docs/gis-convention.md`
- 테스트: `docs/testing-convention.md`
- Git: `docs/git-convention.md`

---

## 11. 단계별 통합 기준 (현재 작업: PR #16)

> 2026-11-07 확인 기준: PR #25와 #19는 `dev`에 머지 완료, PR #16은 미통합, PR #21은 후속 작업이다. **작업 시점의 최신 `origin/dev`, PR 상태, 실제 코드가 우선**한다. 이 절은 1~10장의 규칙을 완화하지 않는다.

1. **완료 #25:** 코스 상세·마이페이지 UI/UX, 지도 컨트롤, 반응형 구성. 이후 PR의 오래된 화면으로 덮어쓰지 않는다.
2. **완료 #19:** 산 목록·검색·상세 API, 서비스 가능 상태, 실제 산 마커, `RouteSetupPage` 검증. 유지·회귀 검증 대상이다.
3. **현재 #16:** `feat/#3-course-geojson-editor`에 최신 `origin/dev`를 병합한다. #16의 GeoJSON 가져오기, 코스 목록·상세·등록·이름/메모 수정·삭제·ETag 기능을 기존 UI 및 분석 기능과 통합한다.
4. **후속 #21:** #16 머지 후 `feature/#20-course-nearby`의 주변 시설·계단 API를 통합한다. #16 단계에서 #21의 기능을 새로 만들지 않는다.

**충돌 해결 시 기능별 우선 기준**

- 화면 디자인·반응형·기존 탭·지도 컨트롤·지형 분석: 최신 `origin/dev`
- 산 조회 API·마커·ID 검증·산 선택: 최신 `origin/dev`에 반영된 #19
- 코스 CRUD·GeoJSON 가져오기·ETag/If-Match·사용자별 목록: #16 구현 + 실제 BE 계약
- 주변 시설 API의 신규 구현: #21 작업 때만
- 양쪽의 유효한 테스트는 모두 보존하고 현재 통합 결과에 맞게 갱신한다.
- 특정 파일 전체를 `ours` 또는 `theirs`로 택하는 방식이 아니라 기능 단위로 병합한다.

## 12. 선행 점검 및 Git 안전 규칙

1. `AGENTS.md`, `docs/`, 실제 코드를 읽고 `git status --short --branch`, `git branch -vv`, `git fetch origin --prune`, `git log -n 5 --oneline origin/dev`로 기준을 확인한다.
2. 작업 브랜치는 `feat/#3-course-geojson-editor`다. 브랜치명에 `#`가 있으므로 명령에서는 따옴표로 감싼다. `dev`에 직접 수정하지 않는다.
3. 사용자가 가져온 `AGENTS.md`의 로컬 변경과 개인 프롬프트 파일은 보존한다. 다른 미커밋 변경이 있으면 절대 덮어쓰지 말고 먼저 보고한다. 병합으로 기존 작업을 덮을 위험이 있으면 병합을 시작하지 않는다.
4. 안전하다면 `git merge --no-commit --no-ff origin/dev`로 최신 dev를 현재 PR 브랜치에 병합한다. 이미 병합이 진행 중이면 다시 실행하지 않는다. **자동 merge commit은 만들지 않는다.**
5. 이때 `ours`는 #16, `theirs`는 `origin/dev`이다. `git checkout --ours/--theirs .` 등의 일괄 선택, 임의 `rebase`, `reset --hard`, 강제 stash, `push --force`를 금지한다.
6. 충돌마다 #16의 목적과 dev의 목적을 비교하고, 선택한 해법·남은 제약을 기록한다. 해결 불가능한 충돌이 있으면 근거와 안전한 다음 조치를 보고하고 임의 결정하지 않는다.
7. 사용자의 별도 지시 없이는 `commit`, `push`, PR merge를 수행하지 않는다. `AGENTS.md`와 개인 프롬프트를 자동으로 커밋 대상으로 추가하지 않는다.
8. Backend 저장소가 로컬에 있으면 읽기 전용으로만 참조한다. Backend 코드·데이터·설정은 수정하지 않는다.

## 13. 기존 #19 기능 회귀 방지 규칙

- `src/features/course/api/mountains.ts`의 `getMountains`, `getMountain`, `getServiceArea`를 보존한다. 산 ID 검증·URL 경로 세그먼트 인코딩도 유지한다.
- `src/features/course/types/mountain.ts`의 목록·상세·서비스 영역 타입을 불필요하게 중복 선언하거나 구버전 타입으로 교체하지 않는다.
- #16의 `getImportMountains(page, signal)`과 #19의 `getMountains({ page, size: 100 })`는 동일한 산 목록 API를 사용한다. #16의 `useImportMountainsQuery`가 필요로 하는 무한 페이지 조회와 `AbortSignal`을 유지하도록 공통 API를 호환성 있게 확장하거나 얇은 어댑터를 둔다.
- 산 검색·페이지 이동·선택 마커·선택한 산의 지도 중심 이동·로딩/오류/서비스 불가 상태를 유지한다.
- `RouteSetupPage`의 유효한 산 ID 검사, 산 상세 조회 상태에 따른 진행 차단, 최신 재조회 전 캐시 기반 진행·리다이렉트 방지 동작을 보존한다.
- `vite.config.ts`의 현재 동작하는 프록시 target을 임의 변경하지 않는다.
- BBOX 자동 검색과 서비스 영역 폴리곤 지도 표시가 아직 미구현이라면 이번 #16 작업에서 새로 구현하지 않는다.

## 14. PR #16 상세 통합 규칙

### 14-1. 실제 구현 범위와 제외 범위

- #16의 실제 구현을 통합한다: GeoJSON 단일 2D LineString 가져오기·미리보기·등록, 내 코스 목록/상세 조회, 코스명·메모 수정, 코스 삭제, ETag 기반 충돌 처리, 사용자 세션 격리 및 오류 안내.
- PR #16 설명에는 **형상 꼭짓점 이동·추가·삭제, 직접 그리기, 검색·정렬 API, GPX 입출력**이 이번 구현에서 제외되었다. Issue #3에 쓰여 있다는 이유만으로 이 기능을 새로 구현하지 않는다.
- 경로 계산·난이도 알고리즘, #21 주변 시설 API, 신규 지형 분석 기능, UI 전면 재설계도 이번 범위 밖이다.

### 14-2. 코스 상세 화면: 가장 중요한 통합 지점

관련 파일: `src/pages/CourseDetailPage.tsx`, `src/features/course/components/CourseDetailPanel.tsx`, `src/features/course/hooks/useCourseDetailState.ts`, 코스 상세 관련 CSS·테스트.

- 최신 dev의 `CourseTerrainAnalysisPanel`, `MockElevationProfileSection`, `TerrainAnalysisPanel`, `useTerrainAnalysis`, 기존 탭·시설 미제공 상태·접근성·모바일 UI를 보존한다.
- #16의 실제 상세 조회, 경로 GeoJSON 지도 레이어, ETag, 삭제 확인·완료 흐름을 합친다.
- 최신 dev에서 이미 존재하는 실제 코스 조회·오류 처리와 #16의 조회 로직을 비교하고 중복 요청·중복 훅을 제거한다. 단순히 #16의 전체 `CourseDetailPage.tsx`로 교체하지 않는다.
- 실제 코스의 `courseId`와 `revNo`가 기존 지형 분석의 입력·상태 유지에 그대로 쓰이도록 한다. Mock 상세·데모·상태 표시를 불필요하게 없애지 않는다.
- `CourseDetailPanel`의 탭 구조·`overviewAnalysis`·`terrainContent`·`facilitiesContent` 계약이 깨지지 않도록 조합한다.

### 14-3. 목록·편집·삭제

관련 파일: `MyCoursesPage.tsx`, `MyCoursesPanel.tsx`, `MyCourseCard.tsx`, `useMyCoursesState.ts`, `CourseEditPage.tsx`, `CourseEditPanel.tsx`, `useCourseEditState.ts`, 관련 CSS.

- 최신 dev의 카드/레이아웃, 탭·검색·정렬 UI, URL 복귀 맥락, 모달·반응형 동작을 우선 보존한다.
- #16의 로그인 사용자 실제 코스 목록과 0부터 시작하는 페이지 조회를 연결한다. Backend `GET /courses?page=`는 페이지 응답이며 최대 9개 단위로 조회한다.
- dev에는 Mock 기반 `q`/`tab`/`sort`/`preview`가 있고, #16 목록은 API `page` 중심이다. **서버가 지원하지 않는 전체 목록 검색·정렬·필터를 지원하는 것처럼 구현하지 않는다.** 가능 범위의 UI를 유지하고, 불가한 항목은 명시적 비활성·안내 또는 범위 제한된 동작으로 정리해 보고한다.
- 목록 → 상세 → 편집 → 목록 복귀 과정의 페이지·탭·검색 맥락을 손실 없이 처리하고, 잘못된 URL 값·계정 전환 시 상태가 섞이지 않도록 한다.
- #16의 원본과 draft 분리, 이름/메모 검증, 수정·취소·초기화·미저장 이탈 확인, 저장 실패 시 입력 유지, 수동 재조회 기능을 유지한다.
- 코스 수정·삭제에서 강한 ETag 원문과 `If-Match`를 사용하고, ETag 누락·수정 충돌 시 자동 덮어쓰기/자동 재시도하지 않는다. 성공 후 관련 Query 캐시를 갱신한다.
- dev의 `useCourseEditState(courseId)`와 #16의 `useCourseEditState(initialSnapshot)` 등 **훅 인터페이스 차이**는 페이지·패널·테스트 전체 소비자를 확인하면서 해결한다.

### 14-4. GeoJSON 가져오기와 지도

관련 파일: `CourseImportPage.tsx`, `CourseImportPanel.tsx`, `useCourseImportState.ts`, `courseGeometry.ts`, `useCourseLayer.ts`, `OpenLayersMap.tsx`, `src/app/router.tsx`.

- `/my-courses/import` 보호 라우트를 추가하고, `/my-courses/:courseId`보다 앞에서 선언한다.
- 단일 2D LineString 입력 형식, 유효 좌표, 파일 오류, 지도 미리보기, 산 선택·페이지 조회, 코스명·메모, 등록·실패·이탈 확인 기능을 보존한다.
- GeoJSON `[경도, 위도]`를 지도에서 필요한 지점에만 EPSG:3857로 변환한다. 원본 좌표·순서·방향을 유지한다.
- OpenLayers Map 인스턴스는 공통 `features/map`에서만 생성·해제하며, 추가 레이어와 지도 컨트롤의 수명·이벤트 해제를 보장한다.
- #16의 산 가져오기 선택 기능은 13장의 공통 산 API를 재사용한다. #19 구현을 덮어쓰지 않는다.

### 14-5. 인증·Backend 계약

- 기존 JWT Bearer 토큰, Axios 401 인터셉터, `ProtectedRoute` 및 사용자 전환 시 캐시/요청 분리를 유지한다.
- Backend `CourseController` 계약: `GET /courses?page=0`, `POST /courses`, `GET /courses/{courseId}`, `PATCH /courses/{courseId}`, `DELETE /courses/{courseId}`를 기준으로 실제 DTO와 HTTP 헤더를 확인한다.
- 코스 ID·산 ID는 문자열로 처리하고, 상세 응답의 `geometry`와 `revNo`를 임의로 바꾸지 않는다.
- 서버에서 제공하지 않는 필드나 상태를 만들어 성공 응답처럼 보여주지 않는다. 연결되지 않은 기능은 미제공·예시로 구분한다.

## 15. 후속 PR #21 영향, 검증 및 보고

### #21과의 경계

- 이번 단계에서 `NearbyFacilitiesPanel`과 기존 상세의 시설 탭을 지우거나 #21 API를 미리 이식하지 않는다.
- #21 통합 시 실제 `courseId`·`revNo`와 #16의 GeoJSON 지도 레이어, 상세/분석 상태를 재사용할 수 있어야 한다.
- `features/analysis` 변경이 필요하면 꼭 필요한 통합 변경만 하고 이유를 보고한다.

### 검증

1. `git status --short --branch`, `git diff --check`로 변경·충돌 마커를 점검한다.
2. `pnpm typecheck`, `pnpm lint`, `pnpm build`를 실행한다.
3. 다음 E2E를 우선 실행한다(실제 존재하는 파일만, 경로가 다르면 확인 후 조정):

```bash
pnpm exec playwright test tests/e2e/course-import.spec.ts tests/e2e/course-detail-api.spec.ts tests/e2e/course-edit-api.spec.ts tests/e2e/course-delete-api.spec.ts tests/e2e/course-pagination.spec.ts tests/e2e/course-account-switch.spec.ts tests/e2e/course-request-lifecycle.spec.ts
pnpm exec playwright test tests/e2e/mountain-select.spec.ts tests/e2e/route-setup.spec.ts tests/e2e/terrain-3d.spec.ts
```

4. dev의 최신 분석·코스 상세 UI 테스트 및 #16의 실제 CRUD 테스트를 모두 보존한다. 가능하면 전체 `pnpm test:e2e`를 실행한다.
5. Mock 기반 E2E 통과와 실제 Backend 연동 검증을 구분한다. 전체 테스트 실패는 변경으로 생긴 회귀인지 기존 dev에서도 재현되는 실패인지 근거를 제시한다.
6. 불필요한 스냅샷 갱신, 테스트 삭제·skip, 오류 은폐, 무관한 코드 정리는 금지한다.

### 완료 보고

- 시작 브랜치/HEAD, 병합한 `origin/dev` SHA 및 merge 진행 여부
- 충돌 파일별 해결 전략과 유지한 동작
- 변경 파일/핵심 API·UI 연결 결과
- #19 산 연동, #25 UI, 기존 지형 분석, #16 CRUD 각각의 보존 결과
- 테스트별 PASS/FAIL/미실행과 재현 근거
- 기존 미구현 기능과 #21 후속 충돌 예상 파일
- `AGENTS.md`/개인 파일의 처리 상태 및 `commit`/`push`/PR merge 미실행 여부
