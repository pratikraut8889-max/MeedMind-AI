import React from 'react';

// --- Types & Themes ---

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost' | 'emergency';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  darkMode?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  id,
  type = 'button',
  ...rest
}) => {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5 min-h-[32px]',
    md: 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl gap-2 min-h-[40px]',
    lg: 'px-5 py-2.5 text-sm sm:text-base font-semibold rounded-xl gap-2.5 min-h-[48px]'
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors',
    secondary:
      'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
    outline:
      'bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
    danger:
      'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 transition-colors',
    emergency:
      'bg-red-700 text-white shadow-sm hover:bg-red-800 active:bg-red-900 border border-red-800 font-bold transition-colors',
    success:
      'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition-colors',
    ghost:
      'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer disabled:cursor-not-allowed ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></span>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

// --- Card Component ---

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  highContrast?: boolean;
  darkMode?: boolean;
  accent?: 'none' | 'danger' | 'warning' | 'success' | 'info' | 'primary';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  highContrast = false,
  darkMode = false,
  accent = 'none',
  hoverable = false,
  id,
  ...rest
}) => {
  let bgClass = darkMode
    ? 'bg-slate-800/95 border-slate-700/80 text-slate-100'
    : 'bg-white border-slate-200/90 text-slate-800 shadow-sm';

  if (highContrast) {
    bgClass = 'bg-slate-950 border-2 border-yellow-400 text-yellow-300';
  }

  const accentStyles: Record<string, string> = {
    none: '',
    danger: 'border-l-4 border-l-rose-500',
    warning: 'border-l-4 border-l-amber-500',
    success: 'border-l-4 border-l-emerald-500',
    info: 'border-l-4 border-l-sky-500',
    primary: 'border-l-4 border-l-blue-600'
  };

  const hoverStyle = hoverable
    ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-slate-600 transition-all cursor-pointer'
    : 'transition-all';

  return (
    <div
      id={id}
      className={`rounded-2xl border p-5 sm:p-6 ${bgClass} ${accentStyles[accent]} ${hoverStyle} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

// --- Badge Component ---

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'ai';

export const Badge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  icon?: string;
}> = ({ tone = 'neutral', children, className = '', icon }) => {
  const toneStyles: Record<BadgeTone, string> = {
    neutral:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    info:
      'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    success:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning:
      'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    purple:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    ai:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${toneStyles[tone]} ${className}`}
    >
      {icon && <i className={`${icon} text-[10px]`}></i>}
      <span>{children}</span>
    </span>
  );
};

// --- Page Header Component ---

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  badge?: React.ReactNode;
  onBack?: () => void;
  backText?: string;
  actions?: React.ReactNode;
  darkMode?: boolean;
  highContrast?: boolean;
}> = ({
  title,
  description,
  badge,
  onBack,
  backText = 'Back',
  actions,
  darkMode,
  highContrast
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 mb-6 border-b border-slate-200/80 dark:border-slate-800">
      <div className="flex items-start gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className={`mt-1 p-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Go back"
            aria-label="Go back"
          >
            <i className="fas fa-arrow-left text-xs mr-1.5"></i>
            <span>{backText}</span>
          </button>
        )}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                highContrast
                  ? 'text-yellow-300'
                  : darkMode
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p
              className={`text-xs sm:text-sm mt-1 max-w-2xl ${
                highContrast
                  ? 'text-yellow-100'
                  : darkMode
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

// --- Alert Banner Component ---

export const AlertBanner: React.FC<{
  type?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  message: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  darkMode?: boolean;
}> = ({
  type = 'info',
  title,
  message,
  action,
  onDismiss,
  className = '',
  darkMode
}) => {
  const configs = {
    info: {
      bg: darkMode ? 'bg-sky-950/40 border-sky-800 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900',
      icon: 'fas fa-info-circle text-sky-500'
    },
    warning: {
      bg: darkMode ? 'bg-amber-950/40 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900',
      icon: 'fas fa-exclamation-triangle text-amber-500'
    },
    danger: {
      bg: darkMode ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900',
      icon: 'fas fa-shield-halved text-rose-500'
    },
    success: {
      bg: darkMode ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: 'fas fa-check-circle text-emerald-500'
    }
  };

  const current = configs[type];

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${current.bg} ${className}`}>
      <i className={`${current.icon} mt-0.5 text-base shrink-0`}></i>
      <div className="flex-1">
        {title && <div className="font-bold mb-0.5">{title}</div>}
        <div className="opacity-95 leading-relaxed">{message}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      )}
    </div>
  );
};

// --- Empty State Component ---

export const EmptyState: React.FC<{
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  darkMode?: boolean;
}> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
  darkMode
}) => {
  return (
    <div
      className={`p-10 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center ${
        darkMode
          ? 'bg-slate-800/40 border-slate-700 text-slate-300'
          : 'bg-slate-50/60 border-slate-200 text-slate-600'
      } ${className}`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 text-xl ${
          darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'
        }`}
      >
        <i className={icon}></i>
      </div>
      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} size="sm" variant="primary">
          {actionText}
        </Button>
      )}
    </div>
  );
};

// --- Clinical Progress / Loading State ---

export const ClinicalLoadingState: React.FC<{
  stepText?: string;
  subText?: string;
  darkMode?: boolean;
}> = ({
  stepText = 'Synthesizing clinical findings...',
  subText = 'Processing medical terminology and verifying reference intervals',
  darkMode
}) => {
  return (
    <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
      <div className="relative mb-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <i className="fas fa-microscope text-xl animate-pulse"></i>
        </div>
        <div className="absolute -inset-1 rounded-2xl border border-blue-400/30 animate-ping"></div>
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">{stepText}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">{subText}</p>
      <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-5 overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-2/3"></div>
      </div>
    </div>
  );
};

// --- Toast Notification Component ---

export const Toast: React.FC<{
  message: string;
  type?: 'success' | 'info' | 'error';
  onClose?: () => void;
}> = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: 'fas fa-check-circle text-emerald-400',
    info: 'fas fa-info-circle text-blue-400',
    error: 'fas fa-exclamation-circle text-rose-400'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-800 text-xs sm:text-sm animate-fade-in max-w-md">
      <i className={icons[type]}></i>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-white ml-2">
          <i className="fas fa-times text-xs"></i>
        </button>
      )}
    </div>
  );
};
