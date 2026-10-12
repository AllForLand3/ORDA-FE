# Frontend Architecture

## 목적과 범위

ORDA GIS 등산 코스 서비스의 Frontend는 지도에서 등산 코스를 탐색·표현하고 Backend REST API와 통신하는 독립 Repository다. 이 문서는 기술 스택, 구성 경계, 주요 흐름만 정의하며 구체 화면과 도메인 모듈 목록은 실제 요구사항과 코드에 맡긴다.

## 기술 스택

- React, TypeScript, Vite, pnpm
- React Router
- TanStack Query, Axios
- Tailwind CSS
- OpenLayers
- ECharts

확정된 스택을 동일 목적의 다른 도구로 임의 교체하지 않는다. 버전과 세부 플러그인은 Repository 설정을 기준으로 한다.

## 논리 구조

일반적인 책임 분리는 다음과 같다. 실제 디렉터리명과 세분화 수준은 기존 코드에 맞춘다.

```text
src/
├─ app/          # 앱 진입점, 전역 Provider, 라우팅
├─ pages/        # 라우트 단위 화면 조합
├─ features/     # 사용자 기능 단위 상태와 UI
├─ components/   # 여러 기능이 공유하는 표현 컴포넌트
├─ api/          # HTTP 클라이언트와 요청 함수
├─ hooks/        # 공용 React 훅
├─ types/        # 공유 타입
├─ utils/        # 부작용 없는 공용 함수
└─ assets/       # 정적 자산
```

이 구조는 방향을 설명하는 예시다. 모든 폴더를 미리 만들거나 도메인별 세부 구조를 강제하지 않는다.

## 의존 방향

- `app`과 `pages`는 기능과 공용 모듈을 조합한다.
- `features`는 API 함수와 공용 컴포넌트를 사용할 수 있다.
- 공용 컴포넌트와 유틸리티는 특정 페이지에 의존하지 않는다.
- API 응답 타입과 화면 전용 상태는 구분한다.

## 주요 흐름

1. React Router가 URL에 맞는 페이지를 선택한다.
2. 페이지 또는 기능 모듈이 TanStack Query를 통해 서버 상태를 요청한다.
3. Axios 기반 API 계층이 Backend와 통신한다.
4. 응답은 화면 모델로 필요한 만큼 변환되어 React 컴포넌트에 전달된다.
5. 공간 데이터는 `gis-convention.md`에 따라 OpenLayers에 표시된다.
6. 통계·프로파일 데이터는 의미와 단위를 유지한 채 ECharts로 시각화한다.

HTTP 계약은 `api-convention.md`, React 구현 세부는 `frontend-convention.md`, 검증 전략은 `testing-convention.md`를 따른다.
