import { useEffect } from 'react';
import { useAppDispatch } from '@/hooks/useAppDispatch.ts';
import { clearCredentials, setCredentials, setUser } from '../authSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { useNavigate } from 'react-router-dom';
import { useLazyGetMeQuery, useRefreshMutation } from '../api/authApi';

export const AuthInitializer = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const roleRedirect = useAuthRedirect();
  const [refresh] = useRefreshMutation();
  const [triggerMe] = useLazyGetMeQuery();

  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      try {
        const token = await refresh().unwrap();
        if (!isActive) return;
        dispatch(setCredentials({ accessToken: token.access_token }));

        const user = await triggerMe().unwrap();
        if (!isActive) return;
        dispatch(setUser(user));
        navigate(roleRedirect, { replace: true });
      } catch {
        if (!isActive) return;
        dispatch(clearCredentials());
      }
    };

    bootstrap();

    return () => {
      isActive = false;
    };
  }, [dispatch, refresh, triggerMe]);

  return null;
};
