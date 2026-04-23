import type { ReactNode } from 'react'

// Inline SVG icons for toolbar tools. Each icon is rendered at 16-18px inside
// IconButton's 36x36 frame. Use `stroke="currentColor"` so the button's active
// colour flows through naturally.
const SVG_PROPS = {
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const ICONS: Record<string, ReactNode> = {
  select: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <path d="M4 3 L4 15 L8 11 L11 17 L13 16 L10 10 L16 10 Z" />
    </svg>
  ),
  pan: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <path d="M7 10 V5.5 a1.2 1.2 0 0 1 2.4 0 V4 a1.2 1.2 0 0 1 2.4 0 V5 a1.2 1.2 0 0 1 2.4 0 V7 a1.2 1.2 0 0 1 2.2 0 V12 a5 5 0 0 1-5 5 H10 a3.5 3.5 0 0 1-3-1.8 L5 12 a1.3 1.3 0 0 1 2-1.5 Z" />
    </svg>
  ),
  entity: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <rect x={3} y={6} width={14} height={8} rx={1} />
    </svg>
  ),
  relationship: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <path d="M10 3 L17 10 L10 17 L3 10 Z" />
    </svg>
  ),
  attribute: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <ellipse cx={10} cy={10} rx={7} ry={4.5} />
    </svg>
  ),
  isa: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <path d="M4 6 L16 6 L10 15 Z" />
    </svg>
  ),
  connect: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <circle cx={4.5} cy={10} r={2} />
      <circle cx={15.5} cy={10} r={2} />
      <line x1={6.5} y1={10} x2={13.5} y2={10} />
    </svg>
  ),
  quickRelationship: (
    <svg viewBox="0 0 24 20" {...SVG_PROPS} aria-hidden>
      <rect x={1} y={7} width={5} height={6} rx={0.6} />
      <path d="M12 6 L15 10 L12 14 L9 10 Z" />
      <rect x={18} y={7} width={5} height={6} rx={0.6} />
      <line x1={6} y1={10} x2={9} y2={10} />
      <line x1={15} y1={10} x2={18} y2={10} />
    </svg>
  ),
  quickGeneralization: (
    <svg viewBox="0 0 20 20" {...SVG_PROPS} aria-hidden>
      <path d="M6 3 L14 3 L10 10 Z" />
      <line x1={7} y1={11} x2={4} y2={17} />
      <line x1={13} y1={11} x2={16} y2={17} />
    </svg>
  ),
}
