import type { ButtonHTMLAttributes } from 'react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

const toneClasses: Record<NonNullable<ActionButtonProps['tone']>, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border border-slate-200 text-slate-700 hover:bg-slate-100',
  danger: 'border border-rose-200 text-rose-700 hover:bg-rose-50',
  ghost: 'border border-transparent text-slate-600 hover:bg-slate-100'
};

const sizeClasses: Record<NonNullable<ActionButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-5 py-2 text-sm'
};

export const ActionButton = ({ tone = 'secondary', size = 'sm', className = '', ...props }: ActionButtonProps) => {
  return (
    <button
      className={`rounded-full font-semibold transition ${toneClasses[tone]} ${sizeClasses[size]} ${className}`.trim()}
      {...props}
    />
  );
};
