import { useGetSystemsQuery } from '../api/systemApi';
import { useAppDispatch } from '../../../hooks/useAppDispatch';
import { useAppSelector } from '../../../hooks/useAppSelector';
import { selectSystem } from '../slice';

const statusTone: Record<string, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  offline: 'bg-rose-500'
};

import { SectionCard } from '../../../components/SectionCard';

export const SystemOverview = () => {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.system.selectedSystemId);
  const { data, isLoading, isError, refetch } = useGetSystemsQuery();

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6">Loading systems...</div>;
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="font-semibold text-rose-900">Unable to load systems.</p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-rose-700 underline"
          onClick={() => refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <SectionCard>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">System Overview</p>
          <h1 className="font-display text-3xl text-slate-900">Live Fleet Snapshot</h1>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Total systems: {data.metadata.total}</p>
          <p>Updated: {new Date(data.metadata.updatedAt).toLocaleString()}</p>
        </div>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.data.map((system) => (
          <button
            key={system.id}
            type="button"
            onClick={() => dispatch(selectSystem(system.id))}
            className={`rounded-2xl border px-5 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
              selectedId === system.id
                ? 'border-slate-900 bg-slate-950 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-900'
            }`}
            aria-pressed={selectedId === system.id}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{system.name}</h2>
              <span
                className={`h-2.5 w-2.5 rounded-full ${statusTone[system.status] ?? 'bg-slate-400'}`}
                aria-label={system.status}
              />
            </div>
            <p className="mt-2 text-sm opacity-70">Last heartbeat: {system.lastHeartbeat}</p>
          </button>
        ))}
      </div>
    </SectionCard>
  );
};
