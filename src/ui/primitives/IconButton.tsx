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
  className = '',
  ...rest
}: IconButtonProps) => (
  <button
    {...rest}
    aria-pressed={active || undefined}
    className={`inline-flex items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      active
        ? 'bg-blue-100 text-blue-700'
        : 'bg-transparent text-slate-700 hover:bg-slate-100'
    } ${SIZES[size]} ${className}`}
  >
    {icon}
  </button>
)
