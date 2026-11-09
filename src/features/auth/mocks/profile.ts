// Figma 117:863의 UI 예시. 실제 로그인 사용자·프로필 응답 DTO가 아니다.
// 향후 합의된 응답을 화면 모델에 매핑할 위치이며 현재는 조회 요청을 하지 않는다.
export const MOCK_PROFILE = {
  name: '오르다',
  email: 'orda@example.com',
} as const;
