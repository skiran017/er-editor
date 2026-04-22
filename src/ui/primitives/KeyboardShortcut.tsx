export interface KeyboardShortcutProps {
  readonly combo: string
}

export const KeyboardShortcut = ({ combo }: KeyboardShortcutProps) => (
  <kbd className="inline-flex rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
    {combo}
  </kbd>
)
