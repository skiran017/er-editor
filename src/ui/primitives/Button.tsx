import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  readonly size?: 'sm' | 'md'
  readonly children: ReactNode
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400',
  secondary:
    'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:bg-slate-100 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 dark:disabled:bg-slate-800',
  danger:
    'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300 dark:bg-red-500 dark:hover:bg-red-400',
  ghost:
    'bg-transparent text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700',
}

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-9 px-3 text-sm',
}

export const Button = ({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) => (
  <button
    {...rest}
    type={type}
    className={`inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors touch-manipulation disabled:cursor-not-allowed pointer-coarse:min-h-[44px] ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
  >
    {children}
  </button>
)
