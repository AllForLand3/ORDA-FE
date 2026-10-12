# Git Convention

## 브랜치

- `main`: 배포 가능한 안정 브랜치
- `dev`: 기능 통합 브랜치
- `feature/<topic>`: 기능 개발
- `fix/<topic>`: 버그 수정
- `refactor/<topic>`: 동작 변경 없는 구조 개선
- `docs/<topic>`: 문서 변경
- `chore/<topic>`: 설정·도구·기타 유지보수

작업 브랜치는 `dev`를 기준으로 만들고 Pull Request도 원칙적으로 `dev`를 대상으로 한다. 릴리스 방식이 별도로 정해진 경우 Repository의 실제 정책을 따른다.

## 커밋

커밋은 하나의 논리적 변경을 담고 메시지는 `<type>: <summary>` 형식을 사용한다. `type`은 `feature`, `fix`, `refactor`, `docs`, `chore`, `test` 중 변경 성격에 맞는 값을 사용한다.

## Pull Request

- 목적, 핵심 변경, 검증 결과, 영향 범위를 작성한다.
- API 계약이나 GIS 표현이 바뀌면 관련 문서와 양쪽 Repository 영향을 함께 명시한다.
- 작성자는 diff를 확인한 뒤 리뷰를 요청한다.
- 최소 한 명의 리뷰를 거쳐 승인된 변경만 병합한다.
- 리뷰 의견은 반영 여부와 이유를 명확히 답한다.

## AI 작업 제한

AI는 사용자의 명시적 요청 없이는 커밋하거나 원격에 푸시하지 않는다. 강제 푸시, 이력 재작성, 브랜치 삭제도 임의로 수행하지 않는다. 그 밖의 AI 행동 규칙은 `../AGENTS.md`를 따른다.
