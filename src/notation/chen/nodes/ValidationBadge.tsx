export interface ValidationBadgeProps {
  readonly severity: 'none' | 'warning' | 'error'
  readonly cx: number
  readonly cy: number
  /**
   * Already-localised messages (one per rule). Rendered inside an SVG
   * <title> element, which browsers expose as a native hover tooltip on
   * the parent <circle>. Joined by newlines so each rule appears on its
   * own line.
   */
  readonly messages?: readonly string[]
}

export const ValidationBadge = ({ severity, cx, cy, messages }: ValidationBadgeProps) => {
  if (severity === 'none') return null
  const fill = severity === 'error' ? 'fill-red-500' : 'fill-amber-400'
  const title = messages && messages.length > 0 ? messages.join('\n') : undefined
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      data-role="warning-badge"
      data-severity={severity}
      className={fill}
    >
      {title && <title>{title}</title>}
    </circle>
  )
}
