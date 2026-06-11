import { useMemo } from 'react';
import { useAppSelector } from '../../../hooks/useAppSelector';

export const useAuthRedirect = () => {
  const user = useAppSelector((state) => state.auth.user);
  return useMemo(() => {
    if (!user) return '/app';
    return user.role_type === 'handyman' ? '/jobs' : '/app';
  }, [user]);
};
