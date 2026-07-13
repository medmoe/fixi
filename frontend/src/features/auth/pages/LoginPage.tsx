import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { useLoginMutation, useLazyGetMeQuery } from '../api/authApi';
import { useAppDispatch } from '@/hooks/useAppDispatch.ts';
import { setCredentials, setUser } from '../authSlice';
import { useAuthRedirect } from '../hooks/useAuthRedirect';

export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const [triggerMe] = useLazyGetMeQuery();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const roleRedirect = useAuthRedirect();
  const redirectPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? roleRedirect;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const token = await login({ username_or_email: usernameOrEmail, password }).unwrap();
      dispatch(setCredentials({ accessToken: token.access_token }));
      const user = await triggerMe().unwrap();
      dispatch(setUser(user));
      navigate(redirectPath, { replace: true });
    } catch {
      setError('Login failed. Check your credentials and try again.');
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Welcome back</p>
          <h2 className="font-display text-2xl text-white">Sign in to Fixi</h2>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="text-slate-300">Username or Email</span>
            <input
              value={usernameOrEmail}
              onChange={(event) => setUsernameOrEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white"
              required
            />
          </label>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-xs text-slate-400">
          New to Fixi?{' '}
          <Link className="text-amber-300 underline" to="/register">
            Create an account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
