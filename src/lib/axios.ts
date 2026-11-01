import axios, { type AxiosError } from 'axios';

import { clearAccessToken, getAccessToken } from './accessToken';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken && config.url !== '/auth/login') {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestAuthorization = error.config?.headers?.get('Authorization');
    const currentToken = getAccessToken();

    if (
      error.response?.status === 401 &&
      error.config?.url !== '/auth/login' &&
      currentToken !== null &&
      requestAuthorization === `Bearer ${currentToken}`
    ) {
      clearAccessToken();
    }

    return Promise.reject(error);
  },
);
