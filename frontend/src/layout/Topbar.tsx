import { StatusBadge } from '../components/StatusBadge';

export const Topbar = () => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">System Dashboard</p>
          <h1 className="font-display text-2xl text-slate-900">Operations Control</h1>
        </div>
        <StatusBadge label="Connected" tone="neutral" className="px-4 py-2" />
      </div>
    </header>
  );
};
