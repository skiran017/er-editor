import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly 'aria-label': string
  readonly icon: ReactNode
  readonly active?: boolean
  readonly size?: 'sm' | 'md'
}

const SIZES: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
}

export const IconButton = ({
  icon,
  active = false,
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}: IconButtonProps) => (
  <button
    {...rest}
    type={type}
    aria-pressed={active || undefined}
    className={`inline-flex items-center justify-center rounded transition-colors touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] ${
      active
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
    } ${SIZES[size]} ${className}`}
  >
    {icon}
  </button>
)
