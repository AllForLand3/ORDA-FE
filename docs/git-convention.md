# Git Convention

이 문서는 Backend와 Frontend Repository에 같은 내용으로 둔다. 수정할 때는 두 Repository를 함께 고친다.

## 브랜치

- `main`: 배포·시연 가능한 안정 브랜치
- `dev`: 기능 통합 브랜치
- `feature/(#issue)-<topic>`: 기능 개발
- `fix/(#issue)-<topic>`: 버그 수정
- `refactor/(#issue)-<topic>`: 동작 변경 없는 구조 개선
- `docs/(#issue)-<topic>`: 문서 변경
- `chore/(#issue)-<topic>`: 설정·도구·기타 유지보수

작업 브랜치는 `dev`를 기준으로 만들고 Pull Request도 원칙적으로 `dev`를 대상으로 한다. 초기 뼈대 문서의 `develop`, `feat/` 표기는 이 규칙(`dev`, `feature/`)으로 맞춘다.

feature과 같은 type 뒤에는 관련 이슈 번호를 명시한다. (예: `feature/#1-login-api`)

하나의 기능이 Frontend와 Backend에 걸치면 두 Repository에서 같은 브랜치 이름을 쓰고, 각 PR 본문에 상대 PR 링크를 적는다.

## 커밋

커밋은 하나의 논리적 변경을 담고 메시지는 `<type>(#issue): <summary>` 형식을 사용한다. `type`은 `feature`, `fix`, `refactor`, `docs`, `chore`, `test` 중 변경 성격에 맞는 값을 사용한다. 관련 코드, Mapper XML, Migration, 테스트는 가능한 한 같은 논리 단위로 검토할 수 있게 구성한다.

## Pull Request

- 목적, 핵심 변경, 검증 결과, 영향 범위를 작성한다.
- API 계약, SQL, Migration, GIS 계산이 바뀌면 호환성과 배포 영향, 상대 Repository 영향을 명시한다.
- 작성자는 diff를 확인한 뒤 리뷰를 요청한다.
- 최소 한 명의 리뷰를 거쳐 승인된 변경만 병합한다.
- 리뷰 의견은 반영 여부와 이유를 명확히 답한다.
- 병합 방식(squash 등)은 미확정이다.

## AI 작업 제한

AI는 사용자의 명시적 요청 없이는 커밋하거나 원격에 푸시하지 않는다. 강제 푸시, 이력 재작성, 브랜치 삭제도 임의로 수행하지 않는다. 그 밖의 AI 행동 규칙은 AGENTS를 따른다.
