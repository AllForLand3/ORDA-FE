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

export type CurrentUserResponse = AuthUser;
