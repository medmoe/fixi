import type { ReactNode } from 'react';

interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export const SectionCard = ({ children, className = '' }: SectionCardProps) => {
  const base = 'rounded-3xl border border-slate-200 bg-white p-8 shadow-sm';
  return <section className={`${base} ${className}`.trim()}>{children}</section>;
};
