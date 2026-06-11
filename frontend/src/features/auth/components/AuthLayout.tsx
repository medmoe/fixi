import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row">
        <div className="max-w-md space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Fixi</p>
          <h1 className="font-display text-4xl text-white">Your trusted repair network, on demand.</h1>
          <p className="text-sm text-slate-300">
            Sign in to manage jobs, review nearby tasks, and keep your service profile sharp. We keep sessions secure with
            refresh tokens and role-aware access.
          </p>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-xs text-slate-300">
            <p className="font-semibold text-amber-300">Tip</p>
            <p className="mt-2">Use your username or email and keep the refresh cookie enabled for seamless re-entry.</p>
          </div>
        </div>
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
};
