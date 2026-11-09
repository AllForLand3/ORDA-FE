import { useMutation } from '@tanstack/react-query';

import { signup } from '../api/auth';

export function useSignupMutation() {
  return useMutation({ mutationFn: signup });
}
