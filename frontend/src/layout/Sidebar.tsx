import { NavLink } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`;

export const Sidebar = () => {
  const role = useAppSelector((state) => state.auth.user?.role_type);
  return (
    <aside className="hidden w-60 flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sections</p>
        <nav className="mt-4 space-y-2 text-sm font-semibold">
          <NavLink to="/app" className={navClass} end>
            Overview
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profile
          </NavLink>
          <NavLink to="/jobs" className={navClass}>
            Jobs
          </NavLink>
          {role === 'customer' && (
            <NavLink to="/workers" className={navClass}>
              Workers
            </NavLink>
          )}
        </nav>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <p className="font-semibold">Realtime updates</p>
        <p className="mt-2">Enable polling to keep dashboards in sync.</p>
      </div>
    </aside>
  );
};
