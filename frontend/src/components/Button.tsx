import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'ghost';
};

export const Button = ({ tone = 'primary', className = '', ...props }: ButtonProps) => {
  const base = 'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold';
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    ghost: 'border border-slate-300 text-slate-700 hover:bg-slate-100'
  };

  return <button className={`${base} ${variants[tone]} ${className}`} {...props} />;
};
