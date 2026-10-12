# 산길 FE

React, TypeScript, Vite 기반의 산길 프론트엔드입니다.

## 시작하기

```bash
npm install
npm run dev
```

환경 변수는 `.env.example`을 복사해 `.env`로 만든 뒤 설정합니다.

```bash
cp .env.example .env
```

## 디렉터리 구조

- `app`: 라우터, 전역 Provider, 최상위 App
- `pages`: 라우트 단위 화면. feature를 조합하는 역할만 담당
- `features`: 도메인별 기능 모듈 (`api`, `components`, `hooks`, `types`)
- `components`: 도메인 비의존 공통 UI
- `lib`: Axios, React Query 등 기술 설정
- `shared`: 도메인 간 공유하는 상수, 훅, 타입
- `styles`: 전역 스타일 및 디자인 토큰
