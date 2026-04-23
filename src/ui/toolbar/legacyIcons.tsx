// Custom Chen-specific icons ported verbatim from legacy
// (src/legacy/assets/icons). `currentColor` so the active-button colour of
// IconButton flows through.
import type { FC } from 'react'

interface IconProps {
  readonly size?: number
  readonly className?: string
}

/** Partial generalization (ISA): inverted triangle + single line to parent. */
export const GeneralizationIcon: FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <line x1={12} y1={2} x2={12} y2={8} />
    <path d="M5 8 L19 8 L12 20 Z" />
  </svg>
)

/** Total generalization (ISA totale): inverted triangle + double line. */
export const GeneralizationTotalIcon: FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <line x1={10} y1={2} x2={10} y2={8} />
    <line x1={14} y1={2} x2={14} y2={8} />
    <path d="M5 8 L19 8 L12 20 Z" />
  </svg>
)

/** Connect tool: chain-link. */
export const ConnectIcon: FC<IconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)
