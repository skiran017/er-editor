import type { ReactNode } from 'react'
import { useUiStore, type Modal } from '@/state/uiStore'
import { ConfirmModal, type ConfirmModalProps } from './ConfirmModal'
import { ErrorModal, type ErrorModalProps } from './ErrorModal'
import { CheatsheetModal } from './CheatsheetModal'

const renderModal = (m: Modal): ReactNode => {
  const common = { modalId: m.id }
  switch (m.kind) {
    case 'confirm':
      return (
        <ConfirmModal
          key={m.id}
          {...(m.props as unknown as ConfirmModalProps)}
          {...common}
        />
      )
    case 'error':
      return (
        <ErrorModal
          key={m.id}
          {...(m.props as unknown as ErrorModalProps)}
          {...common}
        />
      )
    case 'cheatsheet':
      return <CheatsheetModal key={m.id} {...common} />
    default:
      return null
  }
}

export const ModalStack = () => {
  const modals = useUiStore((s) => s.modals)
  if (modals.length === 0) return null
  const top = modals[modals.length - 1]
  return <>{renderModal(top)}</>
}
