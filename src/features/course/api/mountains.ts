import { apiClient } from '@/lib/axios';
import type { ImportMountainPage } from '../types/mountain';

export async function getImportMountains(page: number, signal?: AbortSignal) {
  const response = await apiClient.get<ImportMountainPage>('/mountains', {
    params: { page, size: 100 },
    signal,
  });
  return response.data;
}
