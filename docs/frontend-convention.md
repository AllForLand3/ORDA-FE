# Frontend Convention

## React와 TypeScript

- 함수 컴포넌트와 훅을 사용하고 렌더링 중 부작용을 만들지 않는다.
- 상태는 가장 가까운 소유자에 두며 서버 상태는 TanStack Query로 관리한다.
- 파생 가능한 값을 중복 상태로 저장하지 않는다.
- `any`, 무분별한 타입 단언, 불필요한 non-null 단언을 피한다.
- 컴포넌트가 커지면 화면 책임과 재사용 가능성을 기준으로 나눈다.

## 라우팅

- React Router의 라우트는 URL로 복원 가능한 화면 상태를 표현한다.
- 검색·필터처럼 공유해야 하는 상태는 적절한 경우 URL query parameter에 둔다.
- 존재하지 않는 경로, 권한 부족, 로딩 실패를 구분해 처리한다.

## 서버 통신

- Axios 인스턴스의 base URL, 공통 헤더, 인터셉터는 한곳에서 관리한다.
- TanStack Query key는 데이터 범위와 파라미터를 안정적으로 반영한다.
- mutation 성공 후 필요한 cache만 갱신 또는 무효화한다.
- 비멱등 요청을 자동 재시도하지 않는다. 조회 재시도도 오류 성격과 사용자 경험을 고려한다.
- API 계약 자체는 `api-convention.md`를 따른다.

## UI와 스타일

- Tailwind CSS는 일관된 디자인 토큰과 반응형 기준에 맞춰 사용한다.
- 반복되는 긴 class 조합은 책임 있는 컴포넌트 또는 유틸리티로 정리한다.
- 의미 있는 HTML, 키보드 조작, focus 상태, label과 대체 텍스트를 제공한다.
- 로딩, 빈 결과, 오류, 비활성 상태를 명시적으로 표현한다.

## 지도와 차트

- OpenLayers 객체의 생성·해제 생명주기를 React 생명주기와 맞춘다.
- 지도 이벤트 listener와 overlay 등 외부 자원은 정리한다.
- 지도 Feature와 React 상태의 중복을 최소화하고 동기화 경계를 명확히 한다.
- ECharts 인스턴스는 container 크기 변경과 컴포넌트 해제에 대응한다.
- 좌표와 분석 의미는 `gis-convention.md`를 따른다.

## 코드 품질

- 환경별 값은 Vite 환경 설정을 사용하되 비밀정보를 Frontend 번들에 넣지 않는다.
- 사용자에게 보여 줄 오류와 진단 로그를 분리한다.
- 성능 최적화 훅은 측정 가능한 필요가 있을 때 사용한다.
- 구조 경계는 `architecture.md`, 테스트는 `testing-convention.md`를 따른다.
