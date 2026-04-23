import type { ReactNode } from 'react'
import { KeyboardShortcut } from '@/ui/primitives'

export interface MenuItemProps {
  readonly label: string
  readonly shortcut?: string
  readonly disabled?: boolean
  readonly danger?: boolean
  readonly onSelect: () => void
  readonly icon?: ReactNode
}

export const MenuItem = ({ label, shortcut, disabled, danger, onSelect, icon }: MenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={onSelect}
    className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${
      danger ? 'text-red-700' : 'text-slate-800'
    }`}
  >
    <span className="flex items-center gap-2">
      {icon && <span className="w-4">{icon}</span>}
      {label}
    </span>
    {shortcut && <KeyboardShortcut combo={shortcut} />}
  </button>
)
