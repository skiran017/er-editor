import type { InputHTMLAttributes } from 'react'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label: string
}

export const Checkbox = ({ label, className = '', ...rest }: CheckboxProps) => (
  <label className="flex items-center gap-2 text-sm text-slate-700">
    <input
      type="checkbox"
      {...rest}
      className={`h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${className}`}
    />
    <span>{label}</span>
  </label>
)
