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

## 11. 현재 통합 작업의 범위·기준과 종료 조건 — FE PR #21

> 이 절 이하(11~17장)는 **PR #21 통합 기간에만 사용하는 임시 작업 지침**이다. 1~10장의 공통 규칙은 계속 적용한다. 2026-11-07 GitHub 확인 기준은 아래와 같으나, 실행 직전 **실제 `origin/dev`와 PR·BE 상태를 다시 조회**하고 불일치 시 최신 소스를 우선한다.

### 11-1. 현재 코드 기준

- FE `dev`: 확인된 SHA `c1a722bce0760d85a47348b10cd05d666389afcc` (이후 변경 가능).
- FE PR #25의 디자인·반응형·지도 컨트롤, PR #19의 산 목록·상세·마커, PR #16의 실제 코스 CRUD·GeoJSON·ETag가 `dev`에 반영됐다.
- FE PR #21: `feature/#20-course-nearby`, 확인된 SHA `bd09c04f41b181a1a0a95846690069226e431aad`, `dev`에 **미반영**, 분기 이후 구조가 변경됐다.
- BE PR #42(코스 주변 지점·시설 API)는 이미 머지된 것으로 확인했다. 이것은 **실제 개발 DB의 시설 데이터 존재 및 FE 통합 성공을 보장하지 않는다**.
- 최신 PR·커밋·API가 위 내용과 다르면 그 차이를 먼저 보고하고 실제 코드를 기준으로 판단한다.

### 11-2. 이번 작업의 정확한 목표

`feature/#20-course-nearby` 브랜치에 최신 `origin/dev`를 통합하고, **이미 #21에 구현된** 주변 화장실·주차장·쉼터·계단 수의 API 조회/표시를 `dev`의 최신 코스 상세 UI에 연결한다.

- **신규 서비스 기능, 신규 Backend 엔드포인트, 전면 UI 리디자인을 개발하는 작업이 아니다.**
- 실제 저장된 코스만 실제 주변 지점/시설 API를 호출한다.
- Mock 코스와 저장 전 맞춤 경로 후보의 예시 UI 및 미제공 문구를 실제 데이터로 위장하지 않는다.
- #16 실제 조회·등록·수정·삭제와 #19 산 선택, 최신 지형 분석 및 반응형 지도는 회귀 없이 유지한다.
- 부수적으로 발견한 무관한 오류나 미구현 이슈는 구분해 보고하고, 요청 범위를 확대하지 않는다.

### 11-3. 머지 이후 적용 범위 (종료 계획)

- **PR #21이 머지되기 전**: 11~17장은 #21 브랜치의 충돌 해결·연동·검증 작업에서만 적용한다.
- **PR #21이 머지된 후**: 11~17장은 더 이상 현재 작업 지침으로 사용하지 않는다. 다음 기능 작업을 시작하기 전에 로컬 `AGENTS.md`에서 삭제하거나 별도 작업 기록(`docs/`의 병합 기록 등)으로 옮길지를 사용자에게 보고하고 지시를 따른다.
- 머지 후에도 유지해야 할 일반적인 규칙(좌표, API, 계정별 캐시 격리, 회귀 테스트)은 1~10장 또는 별도 상시 문서로 이관할 수 있다. **사용자 승인 없이 저장소의 추적 문서를 대량 변경하지 않는다**.
- 후속 작업 AI는 11~17장을 새 기능의 요구사항으로 해석하지 말고 과거 #21 작업의 임시 규칙으로만 취급한다.
- 로컬 `AGENTS.md` 수정본 자체는 **사용자 요청 없이 PR #21 변경 파일에 포함하거나 커밋하지 않는다**. 저장소에 이미 추적된 `AGENTS.md`의 기존 변경도 훼손하지 않는다.

## 12. Git 점검·병합 안전 규칙

1. `AGENTS.md`, `docs/` 관련 문서, Git 상태와 실제 `package.json`·소스를 먼저 확인한다.
2. `git status --short --branch`, `git branch -vv`, `git rev-parse HEAD`, `git fetch origin --prune`, `git rev-parse origin/dev`, `git log -5 --oneline origin/dev` 및 PR #21 원격 브랜치 상태를 확인한다. 이미 병합 진행 중이면 다시 `git merge`를 실행하지 않는다.
3. 작업 브랜치는 `feature/#20-course-nearby`이며, `dev`에 직접 수정하지 않는다. 셸에서 `#`가 포함된 브랜치명은 반드시 따옴표로 감싼다.
4. 로컬 브랜치가 원격 #21과 다른 커밋을 가리키면 이유를 확인한다. `reset --hard`, 강제 rebase, force-push로 이력을 맞추지 않는다.
5. `AGENTS.md`처럼 사용자가 일부러 수정한 작업 지침, 미추적 프롬프트·개인 파일, 기타 미커밋 변경을 **절대로 삭제·덮어쓰기·일괄 stash하지 않는다**. 원치 않는 변경이 섞여 있거나 병합이 이를 덮을 수 있으면 코드를 변경하기 전에 중단 사유와 안전한 선택지를 보고한다.
6. 병합 가능한 작업 트리라면 `git merge --no-commit --no-ff origin/dev`를 사용한다. 충돌 해결 후에도 **merge commit을 자동 생성하지 않는다**. 사용자의 별도 지시가 있어야 commit/push/PR merge가 가능하다.
7. #21 브랜치에서 dev를 병합할 때 `ours`는 **구버전 #21**, `theirs`는 **최신 dev**이다. 일괄 `--ours`/`--theirs`, 파일 전체 덮어쓰기, `git reset --hard`, 임의 rebase, `git push --force` 금지. 각 기능을 의미 단위로 통합한다.
8. 병합 중 `git ls-files -u`로 미해결 파일을 확인하고, `git diff --check HEAD`와 필요 시 `git diff --cached --check`로 충돌 마커·공백을 검증한다. 충돌을 해결한 뒤에도 동작 검증 없이 성공이라고 말하지 않는다.
9. BE 저장소는 읽기 전용 비교 대상이다. DB, API, 인증, 배포, `.env`, lockfile, CI 설정을 승인 없이 변경하지 않는다.

## 13. 예상 충돌 지도 — 반드시 소스와 비교 후 적용

검토한 PR #21의 변경 파일은 **11개**이다. 공통 조상과 최신 dev를 비교했을 때 동일 파일에서 양쪽 수정이 있는 항목은 5개이며, 그중 **약 4개는 Git 내용 충돌 가능성이 높다**. 실제 충돌 파일과 줄 번호는 병합 실행 결과가 우선한다.

| 파일 | 예상 | 지침 |
| --- | --- | --- |
| `src/pages/CourseDetailPage.tsx` | **높음** | dev의 실코스 조회·GeoJSON·지형 분석·삭제·Mock 분기를 보존하고 #21 주변 시설 조회를 이식 |
| `src/features/course/components/CourseDetailPanel.tsx` | **높음** | dev의 `CourseDetailResponse` + 선택적 `mockCourse` 구조 보존, #21의 `nearbyCounts`를 실제 코스에만 반영 |
| `src/features/analysis/components/NearbyFacilitiesPanel.tsx` | **높음** | dev의 `mockData` 전용 UI와 탐색 결과 안내를 보존하며 실제 코스 전용 `CourseNearbyFacilities` 분기 추가 |
| `src/features/analysis/index.ts` | **높음·해결 간단** | dev의 terrain/chart export 유지 + #21의 주변 조회 export 추가 |
| `src/features/analysis/analysis.css` | **낮음** | Git 자동 병합 가능성이 높지만 실제/Mock 시설 UI, 좁은 패널 반응형 스타일 회귀 확인 |

#21 신규 6개 파일은 동일 경로가 dev에 없었던 것으로 확인됐다. 파일 단위 충돌 가능성은 낮으나 인터페이스·인증·실제 응답 계약 검증이 필요하다.

1. `src/features/analysis/api/nearby.ts`
2. `src/features/analysis/types/nearby.ts`
3. `src/features/analysis/hooks/useCourseNearby.ts`
4. `src/features/analysis/hooks/useFacilitySource.ts`
5. `src/features/analysis/components/CourseNearbyFacilities.tsx`
6. `src/features/analysis/components/NearbyPlaceDetails.tsx`

**주의:** 기존 파일 중 자동 병합된 것도 타입 충돌, 잘못된 필드, 누락된 prop 및 보이지 않는 UI 회귀가 생길 수 있으므로 반드시 별도 검토한다.

## 14. 파일별 통합·보존 계약

### 14-1. `CourseDetailPage.tsx`: 최우선 통합 지점

현재 dev는 `CourseDetailPage → CourseDetailWorkspace` 구성이다. 핵심 소스 구조:

- `useCourseDetailState()`는 실제 코스에 `course.courseId`(string), `course.revNo`(number), `course.geometry`, `state.snapshot?.etag` 등을 제공하고, Mock 코스는 `state.isMock` 및 `state.mockCourse`로 구분한다.
- `useCourseLayer`로 실제 GeoJSON을 지도에 추가하며, `CourseDeleteDialog`·`useCourseDeleteState`로 삭제를 처리한다.
- `useAuth`의 `currentUser?.userId`, `useTerrainAnalysis`, `CourseTerrainAnalysisPanel`, `MockElevationProfileSection`, `TerrainAnalysisPanel`로 지형 분석을 관리한다.
- 실제 코스의 시설 탭은 현재 안내 메시지이며, Mock의 시설 탭은 `NearbyFacilitiesPanel candidateName=... mockData`로 렌더링한다.

**적용 규칙**:

- #21의 구버전 `state.course?.id` 참조를 그대로 가져오지 말고 실제 코스에서는 `course?.courseId`를 사용한다. Mock ID·잘못된 ID로 API를 호출하지 않는다.
- #21이 지원하는 `revNo`를 실제 상세 코스의 **현재 서버 버전**으로 전달한다. 없거나 유효하지 않으면 안전하게 조회를 비활성화하거나 정확한 실패 상태를 표시하며 임의 0을 넣지 않는다.
- 사용자/인증 상태가 확정되지 않았거나 코스가 로딩·오류 상태일 때 조회가 불필요하게 발생하지 않도록 한다.
- React 훅을 조건문 안에서 호출하지 않고, 매 렌더에서 호출하되 `enabled`/nullable ID로 조회를 제어한다. 기존 지형 분석의 실행 주기·상태 유지와 충돌하지 않게 한다.
- 실코스 화면의 기존 **코스 비교·지형 분석·주변 시설 탭**, 지도/레이어, 헤더, 삭제/편집, ETag 안내, 반응형·접근성 동작을 유지한다.
- Mock 코스의 실제 API 요청 0건, 모의 코스 편집·내보내기 동작, 맞춤 경로 결과의 예시 안내를 유지한다.
- 주변 시설을 보기 위해 지형 분석 요청을 자동으로 시작하거나, 탭을 바꾸는 것만으로 분석 실행 상태를 리셋하지 않는다.

### 14-2. `CourseDetailPanel.tsx`: 현재 데이터 계약 보존

- dev의 입력은 `course: CourseDetailResponse`, 선택적 `mockCourse?: MockMyCourse`, `overviewAnalysis`/`terrainContent`/`facilitiesContent`이다.
- #21의 구버전 `course: MockMyCourse` 전체를 도입하지 않는다. 기존 거리·예상 시간·누적 상승·메모·주요 지점·분석 출력·탭 구조·긴 글자 처리 보존.
- #21의 `nearbyCounts`(계단·화장실·주차장·쉼터·시설 합계)를 **선택 prop**으로 추가하고 실코스 상세 영역에서만 출력한다. `undefined`(미연결) / `null`(조회 대기·오류·결측) / 숫자 `0`(조회 성공·해당 시설 없음)을 구분한다. 실제 UX 표현은 기존 UI 용어와 일관되게 구현한다.
- 기존 Mock 숫자 및 표시를 그대로 유지한다. 실코스에 Mock 숫자를 섞지 않는다.
- #21에서 계단 수는 I-01 `STAIR` 태그가 있는 **상세지점 수**이지 실제 연속 계단 구간 개수로 확정된 값이 아니다. 기존 라벨을 유지하더라도 의미를 문서화하고 새로운 수치로 과장하지 않는다.
- 코스 목록 카드 `CourseListItem.nearby`는 이미 dev의 별도 목록 응답 요약이다. **목록 쿼리 구조를 재작성하거나 상세 조회 결과를 목록 응답인 것처럼 사용하지 않는다**.

### 14-3. `NearbyFacilitiesPanel.tsx`: 실제/Mock/탐색 결과 분기

- dev의 `mockData` 분기에는 화장실·주차장·쉼터 필터와 카드·상세 UI가 존재한다. **삭제하지 않는다**.
- dev의 기본 `mockData=false` 분기는 저장 전 맞춤 경로 결과 등에서 사용하는 미제공·디자인 예시 화면이다. **갑자기 실제 데이터로 간주하지 않는다**.
- 실제 저장된 서버 코스 ID, 정상 상세 데이터, 적절한 사용자 컨텍스트가 전달될 때만 #21의 `CourseNearbyFacilities`를 렌더링한다.
- 신규 `courseId`, `revNo` 등 선택 prop을 추가할 때 기존 호출 지점 `RouteResultsPage`를 비롯한 모든 소비자를 검사한다.
- 실제 시설 카드의 종류, 거리, 상세 펼침, 주소/원본 메모/제공기관, 로딩·재시도·자료 없음 안내는 #21 기능을 유지한다. 소스/거리/운영 시간 등 확인되지 않은 사실을 만들지 않는다.
- `analysis.css`의 기존 Mock 필터 및 신규 실제 시설 카드 스타일을 모두 유지한다.

### 14-4. `features/analysis/index.ts`: export 결합

- dev의 `useTerrainAnalysis`, `terrainAnalysisConfig`, `CourseTerrainAnalysisPanel`, `ElevationProfileChart`, `MockElevationProfileSection`, 기존 `TerrainAnalysisPanel` export를 제거하지 않는다.
- #21의 `useCourseNearby`, `isServerCourseId`, `CourseNearbySummary` 등 필요한 export만 추가한다.
- 모듈 사이의 순환 import나 `features/analysis ↔ features/course` 직접 의존이 새로 생기지 않도록 한다. 여러 feature가 협력하면 페이지에서 조합한다.

### 14-5. #21 신규 파일 6개: 기존 구현 재사용·최소 수정

- API: `GET /courses/{courseId}/spots`, `GET /courses/{courseId}/facilities`, `GET /facilities/{facilityId}`. 공통 `apiClient`와 기존 인증·401 처리를 사용한다.
- 타입: `NearbySpotsResponse`, `NearbyFacilitiesResponse`, `FacilityDetailResponse` 및 태그·자료 가용성·거리 필드를 실제 BE DTO와 맞춘다. 임의 필드·엔드포인트를 만들지 않는다.
- 조회: I-01 상세지점과 I-02 시설을 취합, 화장실/주차장은 시설, 쉼터는 `REST` 태그가 있는 지점으로 분류. 거리순 정렬과 필드 의미를 유지한다.
- 자료 가용성: `dataAvailable=false`인 자료의 해당 개수는 `null`/정보 없음, `true`이며 목록이 비었을 때는 `0`. 반경·거리·수의 단위를 명시한다.
- 시설 출처: 카드 펼침 시에만 I-04 상세 조회, 결과 없거나 오류이면 안내한다. 상세를 펼치기 전 불필요한 대량 요청을 보내지 않는다.
- 계정 격리: #21의 기존 Query Key는 코스 ID·버전·반경만 포함한다. 실제 dev 인증 흐름을 확인하고 **사용자/세션 식별 요소를 캐시 키에 반영하거나 안전한 무효화 전략을 적용한다**. 사용자 A가 조회한 데이터를 로그아웃/계정 B 전환 후 표시하지 않는다. 로그인 전/후 또는 권한 오류 시 재시도 정책도 검토한다.
- 버전: 조회 응답의 `courseId`, `revNo`, `radiusM`이 요청과 일치하는지 필요한 범위에서 검증한다. 코스 편집·삭제·사용자 전환 후 이전 버전 시설 결과를 무심코 보여주지 않는다.
- 취소: 요청 취소/언마운트에서 이전 사용자 응답이 새로운 화면에 반영되지 않도록 기존 TanStack Query와 API 호출의 `AbortSignal` 적용 가능성을 확인한다. **새로운 요청 추상화 계층을 만들지 말고 최소 보완한다**.
- #21의 `Promise.all`은 둘 중 하나가 실패하면 통합 조회 전체가 실패한다. 이번에는 자동으로 `0곳`으로 표시하지 않는다. 부분 성공 UI 개선은 별도 요청이 없으면 확장하지 말고 위험 및 선택지로 보고한다.
- `isServerCourseId`는 큰 코스 ID를 `number`로 바꾸지 않으며 현재 dev의 `useCourseQuery` ID 범위와 모순되지 않아야 한다.

## 15. Backend 주변 조회 계약과 회귀 방지

FE PR #21에 직접 관련된 BE PR #42의 기능(I-01, I-02, I-04)을 근거로 API 의미를 확인한다. 최신 BE source가 변경됐으면 그 소스가 우선한다.

| 조회 | 메서드/경로(API 클라이언트 기준) | 목적 |
| --- | --- | --- |
| 코스 주변 상세지점 I-01 | `GET /courses/{courseId}/spots` | `STAIR`, `REST` 등 태그가 있는 상세지점 및 태그별 수 |
| 코스 주변 시설 I-02 | `GET /courses/{courseId}/facilities` | 화장실·주차장 및 개수·코스와의 거리 |
| 시설 상세 I-04 | `GET /facilities/{facilityId}` | 시설 출처 등 상세 메타데이터 |

- 공통 Axios 클라이언트가 `/api` prefix와 JWT 헤더를 처리한다. `vite.config.ts`의 기존 프록시 target `http://localhost:8080/orda-api`를 임의로 바꾸지 않는다. 실제 요청 경로는 코드로 재검증한다.
- I-01/I-02는 현재 로그인한 사용자가 소유한 코스 기준이다. 요청 파라미터 `revNo`(선택), `radiusM`(기본 200m, 허용 1~500m)를 BE에 맞게 처리한다.
- 반경은 코스 선형 기준 거리이며 상세지점/시설 응답에 `dataAvailable`, `counts`, `items`, `courseId`, `revNo`, `radiusM` 등이 포함된다.
- 자료가 존재하지 않음과 해당 반경 내 결과 0건을 분리하고, REJECTED·중복 제외 등 Backend가 보장하는 필터 의미를 FE에서 임의로 바꾸지 않는다.
- BE의 `409 CONFLICT`(코스 버전 불일치), `404 COURSE_NOT_FOUND`, `400 INVALID_REQUEST`, `401 UNAUTHORIZED` 등 오류를 기존 응답 코드 기반 안내와 일관되게 처리한다.
- 시설 거리·지점 출처는 API 제공 사실만 표시한다. FE에서 기하/거리를 다시 계산하거나 GeoJSON Point를 임의 변환하지 않는다. 지도에 시설 마커를 신규로 추가하지 않는다.
- 실제 데이터/배포 확인은 API 모킹 테스트와 분리해 보고한다. BE PR이 머지됐다는 이유로 개발 환경 DB 적재 및 응답이 정상이라고 단정하지 않는다.

**기존 기능 회귀 방지**: 산 목록·상세·마커/RouteSetup, 실제 코스 목록·GeoJSON 가져오기·CRUD/ETag/삭제, 지도 레이어, 지형 분석 API 실행/재시도/진행 상태, Mock 상세·탐색 결과 및 반응형 UI를 유지한다.

## 16. 필수 검증과 테스트 매트릭스

### 16-1. 정적 검증

```bash
# 실행 전 현재 변경과 병합 상태 확인
git status --short --branch
git ls-files -u
# 변경 파일 중 공백·충돌 잔여 확인
git diff --check HEAD
# 프로젝트 실행 검사
pnpm typecheck
pnpm lint
pnpm build
```

- `git ls-files -u`가 빈 결과여야 충돌 해결 완료다. `--no-commit` 병합은 해결 후에도 `MERGE_HEAD`가 남을 수 있다. **이때 임의로 commit하지 말고 병합 상태를 정확히 보고**한다.
- 빌드의 기존 청크 크기 경고 등과 실제 타입/번들 실패를 구분한다.
- `pnpm test:e2e`는 실행 환경에 따라 기존 오류가 있을 수 있다. 실패 시 반복 추측 대신 관련 E2E 및 변경 전 dev 재현 여부를 기록한다.

### 16-2. 기능 검증

1. 실제 서버 코스 상세: `courseId`·`revNo`가 있는 경우 주변 지점/시설 API 요청이 발생하고 화장실·주차장·쉼터·계단 수가 정확히 보인다.
2. Mock 코스 상세: 주변 API 요청 0건. 기존 필터·Mock 숫자·모달 UI 유지.
3. 맞춤 경로 예시 결과: 주변 API 요청 0건. 미제공·예시 안내 유지.
4. 백엔드 `dataAvailable=true` + 빈 목록: `0곳` 또는 명시적 빈 결과. `dataAvailable=false`: `정보 없음`, 결측 안내. 서로 섞지 않는다.
5. `REST`, `STAIR` 태그 집계와 시설 `TOILET`, `PARKING` 개수를 중복 없이 처리한다. 거리순 및 거리 단위를 확인한다.
6. 시설 상세: 펼치기 전 I-04 요청 없음, 펼칠 때만 요청. 쉼터 메모와 시설 주소·출처·코스 거리 확인.
7. 401·404·409·네트워크 오류, 재시도, 오래된 `revNo` 시 안전한 오류 표시. 결과를 0으로 가장하지 않는다.
8. 사용자 A 조회 후 로그아웃/사용자 B 로그인: A의 시설 결과가 B에게 보이지 않고 캐시/요청이 분리된다.
9. 상세의 지형 분석 `idle/checking/running/done/failed/conflict` 상태 및 탭 전환, 코스 변경, 삭제·편집 후 새 버전 상태 유지.
10. 360/440/1024px 주요 레이아웃과 접근성, 상세 카드 표시, 필터 및 지도 상호작용 확인.

### 16-3. 자동 테스트 범위

- 새 주변 시설 E2E를 생성하거나 기존 관련 E2E에 테스트를 추가한다. 최소: API 정상/결측/빈 결과/오류·Mock 무호출/버전/계정 전환.
- 기존 `tests/e2e/course-detail-api.spec.ts`, `tests/e2e/my-courses.spec.ts`, `tests/e2e/course-account-switch.spec.ts`, `tests/e2e/route-results.spec.ts`, `tests/e2e/terrain-analysis.spec.ts`, `tests/e2e/terrain-analysis-recovery.spec.ts`를 우선 검증한다. 실제 존재 여부를 확인하고 경로가 바뀌면 코드 기준으로 조정한다.
- 여력이 되면 코스 가져오기/편집/삭제/산 선택의 E2E와 전체 `pnpm test:e2e`를 추가 실행한다.
- Mock 서버 응답과 운영/개발 BE 실연동 결과를 별개로 명시한다. 테스트 실패를 위해 fixture 계약을 왜곡하거나 기존 테스트를 skip하지 않는다.

## 17. 최종 결과 보고 — 코드 변경 전후가 보여야 함

한국어로 다음을 구분해 보고한다.

1. 작업 시작 시 브랜치, HEAD, 원격 #21 SHA, 최신 `origin/dev` SHA, 작업 트리 상태.
2. Git 실제 충돌 파일 목록(예상 4개와 차이가 있으면 이유), 파일마다 dev/PR21 보존 내용 및 해결 근거.
3. 신규 6개 파일의 수용·수정 내용, 자동 병합된 CSS와 `index.ts` export 결과.
4. 실제/Mock/맞춤 경로 후보 각각의 연결 방식과 `courseId`·`revNo` 흐름.
5. 계정별 캐시 분리·요청 취소·오류/결측·부분 실패 방침.
6. 기존 산·코스 CRUD·지도·지형 분석 회귀 여부.
7. 수정한 파일·테스트 파일 목록과 핵심 diff.
8. 검증 명령별 PASS/FAIL/미실행 및 실제 DB 연동 검증 여부(모킹과 구분).
9. 남은 위험과 시연에 영향이 있는 문제를 심각도별로 분리.
10. `AGENTS.md`, 개인 프롬프트 등 사용자 파일 보존 여부 및 **commit/push/PR merge 미실행** 여부.

충돌을 모두 해결했더라도 검증 실패나 실제 연동 미확인이 있으면 "머지 가능"이라고 단정하지 않는다. GitHub PR의 Mergeable 상태와 요구 체크를 별도로 확인한다.
