export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  loginId: string;
  nickname: string;
  role: string;
}

export interface LoginResponse extends AuthUser {
  accessToken: string;
  tokenType: string;
}

export interface SignupRequest {
  loginId: string;
  nickname: string;
  password: string;
}

export interface SignupResponse {
  userId: string;
  loginId: string;
  nickname: string;
}

export type CurrentUserResponse = AuthUser;
