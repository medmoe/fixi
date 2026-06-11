import type { ReactNode } from 'react';

interface InsetCardProps {
  children: ReactNode;
  className?: string;
}

export const InsetCard = ({ children, className = '' }: InsetCardProps) => {
  const base = 'rounded-2xl border border-slate-200 bg-slate-50 p-4';
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
};
