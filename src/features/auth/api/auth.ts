import { apiClient } from '@/lib/axios';

import type {
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '../types/auth';

export async function signup(request: SignupRequest): Promise<SignupResponse> {
  const response = await apiClient.post<SignupResponse>('/users/signup', request);

  return response.data;
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', request);

  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await apiClient.get<CurrentUserResponse>('/auth/me');

  return response.data;
}
