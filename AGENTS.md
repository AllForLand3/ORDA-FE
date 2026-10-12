# ORDA Frontend AI 작업 규칙

이 문서는 AI CLI가 Frontend Repository에서 작업할 때 반드시 지켜야 할 행동 규칙만 정의한다. 기술 구조는 `docs/architecture.md`, 구현 규칙은 `docs/frontend-convention.md`를 따른다.

## 작업 원칙

1. 작업 전 관련 코드와 문서를 읽고 현재 구현을 기준으로 판단한다.
2. 요청 범위에 필요한 최소 변경만 수행하고, 사용자의 기존 변경을 되돌리거나 덮어쓰지 않는다.
3. 확인되지 않은 API, 환경 변수, 화면 정책, 파일 경로를 임의로 만들어 확정하지 않는다.
4. 새 라이브러리 도입, 공개 API 계약 변경, 광범위한 구조 변경은 개발자 승인 없이 수행하지 않는다.
5. Backend 책임인 인증·인가, 데이터 정합성, 공간 연산을 Frontend만으로 보장한다고 가정하지 않는다.
6. 비밀정보를 코드, 로그, 문서에 기록하지 않는다.
7. 변경한 범위에 맞는 검사와 테스트를 실행하고, 실행하지 않은 검증을 성공했다고 보고하지 않는다.
8. 완료 보고에는 변경 파일, 핵심 동작, 실행한 검증, 남은 위험만 간결하게 기록한다.

## 금지 사항

- 사용자의 명시적 요청 없이 `commit`, `push`, 강제 푸시, 브랜치 삭제를 수행하지 않는다.
- 검증을 통과시키기 위해 테스트를 삭제·비활성화하거나 타입 검사를 우회하지 않는다.
- 기존 API 계약과 좌표 의미를 추측하여 임의로 변경하지 않는다.
- 요청과 무관한 일괄 포맷팅이나 리팩터링을 섞지 않는다.

## 문서 책임

- 시스템 경계와 데이터 흐름: `docs/architecture.md`
- Git 협업: `docs/git-convention.md`
- HTTP 계약: `docs/api-convention.md`
- 좌표와 지도 표현: `docs/gis-convention.md`
- 테스트: `docs/testing-convention.md`
- React 구현: `docs/frontend-convention.md`
