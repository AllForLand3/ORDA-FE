import type { MountainSearchParams } from '../types/mountain';

export const mountainQueryKeys = {
  all: ['mountains'] as const,
  list: (params: MountainSearchParams) => [...mountainQueryKeys.all, 'list', params] as const,
  detail: (mountainId: string | null) => [...mountainQueryKeys.all, 'detail', mountainId] as const,
  serviceArea: (mountainId: string | null) =>
    [...mountainQueryKeys.all, 'service-area', mountainId] as const,
};
