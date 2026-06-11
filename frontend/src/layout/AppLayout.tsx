import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-amber-50 to-slate-200 text-slate-900">
      <Topbar />
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-6 pb-16 pt-8">
        <Sidebar />
        <main className="flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
};
