interface StatusBadgeProps {
  label: string;
  tone?: 'info' | 'warning' | 'success' | 'danger' | 'neutral';
  className?: string;
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  info: 'bg-sky-100 text-sky-700',
  warning: 'bg-amber-100 text-amber-700',
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-rose-100 text-rose-700',
  neutral: 'bg-slate-100 text-slate-700'
};

export const StatusBadge = ({ label, tone = 'neutral', className = '' }: StatusBadgeProps) => {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]} ${className}`.trim()}>
      {label}
    </span>
  );
};
