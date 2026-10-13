# Frontend Architecture

## 목적과 범위

ORDA GIS 등산 코스 서비스의 Frontend는 지도에서 산과 등산 코스를 탐색·표현하고 Backend REST API와 통신하는 독립 Repository다. 이 문서는 기술 스택, 구성 경계, 주요 흐름을 정의한다.

## 기술 스택

- React 19, TypeScript, Vite (Next.js를 쓰지 않는다)
- OpenLayers, ECharts
- 목표 스택: pnpm, React Router, TanStack Query, Axios, Tailwind CSS

초기 뼈대는 npm, fetch, 일반 CSS로 되어 있다. 목표 스택으로의 전환 시점은 미확정이며, 전환 전까지는 실제 `package.json`의 구성을 따른다. 확정된 스택을 동일 목적의 다른 도구로 임의 교체하지 않는다.

## 시스템 경계

```
브라우저 (이 저장소) ── /api (REST, GeoJSON EPSG:4326) ──▶ Backend (Spring)
        │
        ├── VWorld WMTS ── 배경지도
        └── GeoServer WMS (선택) ── 등산로·지형 고정 레이어
```

API, 공간 연산, 경로 탐색, 인증·인가는 Backend 책임이다. Frontend에서 경로를 계산하거나 공간 연산 결과를 보정하지 않는다.

## 논리 구조

```
src/
├─ main.tsx       Vite 진입점
├─ app/           라우터(router.tsx), 전역 Provider, 최상위 App
├─ pages/         라우트 단위 화면. features를 조합만 한다
├─ features/
│  ├─ map/        [공용] OpenLayers 지도 생성·해제, 배경지도, 레이어
│  ├─ course/     [1조] 산·코스 탐색, 내 코스 등록·수정·삭제
│  ├─ route/      [2조] 출발·도착·조건 선택, 경로 후보 비교·저장·내보내기
│  ├─ analysis/   [3조] 고도 프로파일, 경사·지점 분석 표시
│  └─ auth/       인증 방식 확정 후 작성
│     (각 기능 안: api/, components/, hooks/, types/)
├─ components/    도메인을 모르는 공통 UI (layout/, ui/)
├─ lib/           axios, queryClient, OpenLayers 투영 등 기술 설정
├─ shared/        공통 constants, hooks, types
├─ assets/        fonts/, icons/
└─ styles/        전역 스타일
```

이 구조는 방향을 설명하는 예시다. 모든 폴더를 미리 만들지 않는다.

## 의존 방향

- `app`과 `pages`는 기능과 공용 모듈을 조합한다.
- `features`는 `lib`, `shared`, `components`를 사용할 수 있다.
- `features`끼리는 서로 직접 import하지 않는다. 함께 써야 하는 것은 `shared`로 옮기거나 `pages`에서 조합한다.
- 공용 컴포넌트와 유틸리티는 특정 페이지나 기능에 의존하지 않는다.
- API 응답 타입과 화면 전용 상태는 구분한다.

## 주요 흐름

1. React Router가 URL에 맞는 페이지를 선택한다.
2. 페이지가 필요한 기능 모듈을 조합한다.
3. 기능 모듈이 TanStack Query(도입 전에는 기존 방식)로 서버 상태를 요청한다.
4. Axios(도입 전에는 fetch) 기반 API 계층이 Backend와 통신한다.
5. 응답은 화면 모델로 필요한 만큼 변환되어 React 컴포넌트에 전달된다.
6. 공간 데이터는 `features/map`이 제공하는 레이어를 통해 gis-convention에 따라 OpenLayers에 표시된다.
7. 고도 프로파일 등은 의미와 단위를 유지한 채 ECharts로 시각화한다.

HTTP 계약은 api-convention, React 구현 세부는 frontend-convention, 검증 전략은 testing-convention를 따른다.
