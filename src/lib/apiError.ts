import axios from 'axios';

import type { ApiErrorResponse } from '@/shared/types/api';

export function getApiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return null;
  }

  return error.response?.data?.code ?? null;
}
