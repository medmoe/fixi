import type { ReactNode } from 'react';

interface SectionHeaderProps {
  label: string;
  title: string;
  action?: ReactNode;
}

export const SectionHeader = ({ label, title, action }: SectionHeaderProps) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <h1 className="font-display text-3xl text-slate-900">{title}</h1>
      </div>
      {action}
    </header>
  );
};
