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
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') {
      clearAccessToken();
    }

    return Promise.reject(error);
  },
);
