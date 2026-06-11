import type { FormHTMLAttributes, ReactNode } from 'react';

interface FilterPanelProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'form';
  onSubmit?: FormHTMLAttributes<HTMLFormElement>['onSubmit'];
}

export const FilterPanel = ({ children, className = '', as = 'div', onSubmit }: FilterPanelProps) => {
  const base = 'mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6';
  if (as === 'form') {
    return (
      <form className={`${base} ${className}`.trim()} onSubmit={onSubmit}>
        {children}
      </form>
    );
  }
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
};
