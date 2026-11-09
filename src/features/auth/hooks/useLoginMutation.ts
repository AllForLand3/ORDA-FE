import { useMutation } from '@tanstack/react-query';

import { login } from '../api/auth';

export function useLoginMutation() {
  return useMutation({ mutationFn: login });
}
