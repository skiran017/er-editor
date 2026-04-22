import type { InputHTMLAttributes } from 'react'

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  readonly label?: string
  readonly size?: 'sm' | 'md'
}

const SIZES: Record<NonNullable<TextInputProps['size']>, string> = {
  sm: 'h-7 text-xs',
  md: 'h-9 text-sm',
}

export const TextInput = ({
  label,
  size = 'md',
  className = '',
  ...rest
}: TextInputProps) => (
  <label className="flex flex-col gap-1 text-xs text-slate-700">
    {label && <span>{label}</span>}
    <input
      {...rest}
      className={`rounded border border-slate-300 px-2 ${SIZES[size]} focus:border-blue-500 focus:outline-none ${className}`}
    />
  </label>
)
