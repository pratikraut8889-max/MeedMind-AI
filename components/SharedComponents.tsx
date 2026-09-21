import React from 'react';

export const Button = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  id = '',
  type = 'button'
}: {
  onClick?: (e?: any) => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
  id?: string;
  type?: 'button' | 'submit' | 'reset';
}) => {
  const baseStyle = 'px-5 py-2.5 rounded-xl font-semibold transition-all duration-150 flex items-center justify-center gap-2 transform active:scale-95 text-xs sm:text-sm';
  const variants = {
    primary: 'bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750',
    danger: 'bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-700',
    ghost: 'text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Card = ({
  children,
  className = '',
  highContrast = false,
  darkMode = false,
  id = ''
}: {
  children: React.ReactNode;
  className?: string;
  highContrast?: boolean;
  darkMode?: boolean;
  id?: string;
}) => {
  let bgClass = darkMode
    ? 'bg-slate-800/90 border border-slate-700 shadow-none text-white'
    : 'bg-white shadow-sm border border-slate-200 text-slate-800';

  if (highContrast) {
    bgClass = 'bg-slate-900 border-2 border-yellow-400 text-yellow-300';
  }

  return (
    <div id={id} className={`rounded-2xl p-5 transition-all ${bgClass} ${className}`}>
      {children}
    </div>
  );
};
