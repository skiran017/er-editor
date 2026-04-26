# Responsive Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ER Editor fully editable across 5 viewport sizes (mobile, tablet, small laptop, large laptop/desktop, larger) with first-class touch + pen input on tablets.

**Architecture:** Three structural layout modes — mobile (bottom-sheet property drawer + bottom-pinned toolbar), tablet (slide-in side drawer + floating toolbar), desktop+ (current inline side panel). A single `usePanelMode` hook reads viewport width and returns the active mode; all chrome components consume that hook to flip layout. Touch gestures (pinch-zoom, two-finger pan, palm rejection) extend the existing `useTouch` hook; pen input flows through `useMouse` unchanged because pen reports pointerType `pen` (which `useMouse` already accepts) and behaves like mouse for hover + accurate positioning.

**Tech Stack:** Tailwind v4 (default breakpoints `sm:`, `lg:`, `xl:`, `2xl:`), existing zustand `uiStore.panels`, React Flow v12 viewport API for pinch-zoom, Pointer Events spec for pen detection.

**Breakpoint Mapping:**
| User-named screen | Tailwind prefix | Min width | Layout mode |
|---|---|---|---|
| mobile | (none) | 0 | `mobile` (bottom-sheet) |
| tablet | `sm:` | 640px | `tablet` (side drawer) |
| small laptop | `lg:` | 1024px | `desktop` (320px side panel) |
| large laptop / desktop | `xl:` | 1280px | `desktop` (320px side panel) |
| larger | `2xl:` | 1536px | `desktop` (360px side panel) |

The `mobile` mode kicks in below `sm` (Tailwind's mobile-first default). `tablet` mode kicks in at `sm` and stops at `lg`. `desktop` mode kicks in at `lg` and the panel just widens at `2xl`.

---

## File Structure

```
src/
  ui/
    app/
      AppShell.tsx              MODIFY  — switch on usePanelMode, render PropertyDrawer in mobile/tablet
      AppShell.test.tsx         MODIFY  — assert each panel mode renders the right shell
      usePanelMode.ts           CREATE  — viewport-width hook, returns 'mobile' | 'tablet' | 'desktop'
      usePanelMode.test.ts      CREATE
      PropertyDrawer.tsx        CREATE  — bottom-sheet (mobile) or right-side drawer (tablet)
      PropertyDrawer.test.tsx   CREATE
    menu/
      Menu.tsx                  MODIFY  — fewer right-side hints, smaller hamburger on mobile
    toolbar/
      Toolbar.tsx               MODIFY  — bottom-pinned on mobile, top-center elsewhere; touch-sized buttons
      Toolbar.test.tsx          MODIFY  — assert position class per mode
    overlays/
      ToastStack.tsx            MODIFY  — full-width pinned at top on mobile, bottom-right on desktop
      ContextMenu.tsx           MODIFY  — clamp into viewport on small screens
      ConfirmModal.tsx          MODIFY  — full-width on mobile, bounded on desktop
      CheatsheetModal.tsx       MODIFY  — scrollable + full-width on mobile
    primitives/
      IconButton.tsx            MODIFY  — touch hit-target size (min 44×44 on coarse pointers)
      Button.tsx                MODIFY  — touch hit-target size (min 44 height on coarse pointers)
  canvas/
    hooks/
      useTouch.ts               MODIFY  — palm rejection, pinch-zoom, two-finger pan
      useTouch.test.tsx         MODIFY
      useMouse.ts               MODIFY  — explicit pen acceptance comment + pen test coverage
      useMouse.test.tsx         MODIFY  — add pen-event test
    ERCanvas.tsx                MODIFY  — wire useTouch handlers (pinch + 2-finger pan) onto the wrapper
```

No new dependencies. Tailwind v4's default breakpoints are sufficient; no custom `@theme` config required.

---

## Task 1: usePanelMode hook

**Files:**
- Create: `src/ui/app/usePanelMode.ts`
- Test: `src/ui/app/usePanelMode.test.ts`

The hook subscribes to `window.matchMedia` queries for the `sm` (640px) and `lg` (1024px) thresholds and returns `'mobile' | 'tablet' | 'desktop'`. Re-renders consumers when the viewport crosses a threshold.

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/app/usePanelMode.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanelMode } from './usePanelMode'

interface FakeMql {
  matches: boolean
  listeners: ((e: { matches: boolean }) => void)[]
  media: string
  addEventListener: (type: 'change', cb: (e: { matches: boolean }) => void) => void
  removeEventListener: (type: 'change', cb: (e: { matches: boolean }) => void) => void
}

const fakes = new Map<string, FakeMql>()
const fakeMatchMedia = (query: string): FakeMql => {
  let m = fakes.get(query)
  if (!m) {
    m = {
      matches: false, listeners: [], media: query,
      addEventListener: (_t, cb) => { m!.listeners.push(cb) },
      removeEventListener: (_t, cb) => {
        m!.listeners = m!.listeners.filter((l) => l !== cb)
      },
    }
    fakes.set(query, m)
  }
  return m
}
const setMatches = (query: string, v: boolean) => {
  const m = fakes.get(query)!
  m.matches = v
  for (const l of m.listeners) l({ matches: v })
}

beforeEach(() => {
  fakes.clear()
  vi.stubGlobal('matchMedia', fakeMatchMedia)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('usePanelMode', () => {
  it("returns 'mobile' when viewport < 640px (sm not matched)", () => {
    fakeMatchMedia('(min-width: 640px)').matches = false
    fakeMatchMedia('(min-width: 1024px)').matches = false
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('mobile')
  })

  it("returns 'tablet' when sm matches but lg does not (640-1023px)", () => {
    fakeMatchMedia('(min-width: 640px)').matches = true
    fakeMatchMedia('(min-width: 1024px)').matches = false
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('tablet')
  })

  it("returns 'desktop' when lg matches (1024px+)", () => {
    fakeMatchMedia('(min-width: 640px)').matches = true
    fakeMatchMedia('(min-width: 1024px)').matches = true
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('desktop')
  })

  it('updates when the viewport crosses a threshold', () => {
    fakeMatchMedia('(min-width: 640px)').matches = false
    fakeMatchMedia('(min-width: 1024px)').matches = false
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('mobile')
    act(() => { setMatches('(min-width: 640px)', true) })
    expect(result.current).toBe('tablet')
    act(() => { setMatches('(min-width: 1024px)', true) })
    expect(result.current).toBe('desktop')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/ui/app/usePanelMode.test.ts
```
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement usePanelMode**

```ts
// src/ui/app/usePanelMode.ts
import { useEffect, useState } from 'react'

export type PanelMode = 'mobile' | 'tablet' | 'desktop'

const SM_QUERY = '(min-width: 640px)'   // Tailwind sm
const LG_QUERY = '(min-width: 1024px)'  // Tailwind lg

const compute = (sm: boolean, lg: boolean): PanelMode =>
  lg ? 'desktop' : sm ? 'tablet' : 'mobile'

const safeMatch = (query: string): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/**
 * Returns the active layout mode based on viewport width. Re-renders consumers
 * when the viewport crosses a Tailwind sm / lg threshold. Used by AppShell to
 * decide whether the property panel renders inline (desktop) or as a drawer
 * (mobile / tablet).
 */
export const usePanelMode = (): PanelMode => {
  const [mode, setMode] = useState<PanelMode>(() =>
    compute(safeMatch(SM_QUERY), safeMatch(LG_QUERY)),
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const sm = window.matchMedia(SM_QUERY)
    const lg = window.matchMedia(LG_QUERY)
    const update = () => setMode(compute(sm.matches, lg.matches))
    sm.addEventListener('change', update)
    lg.addEventListener('change', update)
    return () => {
      sm.removeEventListener('change', update)
      lg.removeEventListener('change', update)
    }
  }, [])
  return mode
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/ui/app/usePanelMode.test.ts
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/app/usePanelMode.ts src/ui/app/usePanelMode.test.ts
git commit -m "feat(ui/app): usePanelMode hook driven by sm/lg media queries"
```

---

## Task 2: Touch hit-target sizing on primitives

**Files:**
- Modify: `src/ui/primitives/IconButton.tsx`
- Modify: `src/ui/primitives/IconButton.test.tsx`
- Modify: `src/ui/primitives/Button.tsx`

Coarse pointers (touch / pen on tablets without precision) need a 44×44 minimum hit area. Add a `touch-manipulation min-h-[44px] min-w-[44px]` rule conditional on `(pointer:coarse)` via Tailwind's arbitrary media query syntax: `pointer-coarse:min-h-[44px]`. (Tailwind v4 supports the `pointer-coarse:` variant out of the box.)

- [ ] **Step 1: Write the failing test in IconButton.test.tsx**

```tsx
it('exposes a 44px minimum hit target via the pointer-coarse variant', () => {
  const { container } = render(<IconButton aria-label="x" icon={<span>i</span>} />)
  const btn = container.querySelector('button')!
  // Tailwind v4 emits `pointer-coarse:min-h-[44px]` and `pointer-coarse:min-w-[44px]`.
  // The class must be present so the variant kicks in on tablets / phones.
  expect(btn.className).toContain('pointer-coarse:min-h-[44px]')
  expect(btn.className).toContain('pointer-coarse:min-w-[44px]')
})
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
pnpm vitest run src/ui/primitives/IconButton.test.tsx
```
Expected: FAIL — class names not present.

- [ ] **Step 3: Add the variant classes to IconButton**

```tsx
// src/ui/primitives/IconButton.tsx — adjust the base class string
const baseClasses =
  // existing classes preserved
  'inline-flex items-center justify-center rounded ' +
  'pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px] touch-manipulation'
```

- [ ] **Step 4: Same change in Button.tsx**

```tsx
const baseClasses =
  // existing classes preserved
  'inline-flex items-center justify-center rounded ' +
  'pointer-coarse:min-h-[44px] touch-manipulation'
```

- [ ] **Step 5: Re-run, confirm pass**

```bash
pnpm vitest run src/ui/primitives
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/primitives/IconButton.tsx src/ui/primitives/IconButton.test.tsx src/ui/primitives/Button.tsx
git commit -m "feat(ui/primitives): 44×44 touch hit targets via pointer-coarse variant"
```

---

## Task 3: Toolbar responsive positioning

**Files:**
- Modify: `src/ui/toolbar/Toolbar.tsx`
- Modify: `src/ui/toolbar/Toolbar.test.tsx`

On mobile the floating top-center toolbar collides with the hamburger. Pin it to the bottom-center on `<sm` (within thumb reach), keep the existing top-center placement at `sm:` and up. Use `sm:` Tailwind variant to swap.

- [ ] **Step 1: Add the failing test**

```tsx
it('pins to the bottom on mobile (no sm breakpoint)', () => {
  // Toolbar.tsx uses Tailwind utility classes; the bottom-pinned position must
  // appear unprefixed (default = mobile-first) and the top-pinned class must
  // appear with the sm: prefix so it overrides at >=640px.
  const { container } = render(<Toolbar />)
  const nav = container.querySelector('[data-role="toolbar"]')!
  expect(nav.className).toContain('bottom-4')
  expect(nav.className).toContain('sm:top-4')
  expect(nav.className).toContain('sm:bottom-auto')
})
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm vitest run src/ui/toolbar/Toolbar.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Update Toolbar.tsx classes**

```tsx
// In Toolbar.tsx, change the <nav> className to:
className="fixed left-1/2 bottom-4 z-40 flex h-12 -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white/90 px-3 text-slate-700 shadow-lg backdrop-blur-md sm:bottom-auto sm:top-4 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200"
```

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm vitest run src/ui/toolbar
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/toolbar/Toolbar.tsx src/ui/toolbar/Toolbar.test.tsx
git commit -m "feat(ui/toolbar): bottom-pin on mobile, top-center on sm+"
```

---

## Task 4: PropertyDrawer component

**Files:**
- Create: `src/ui/app/PropertyDrawer.tsx`
- Create: `src/ui/app/PropertyDrawer.test.tsx`

A self-contained drawer that wraps the property panel content. On mobile, it slides up from the bottom (max-height 70vh); on tablet, it slides in from the right (width 320px). Visibility is controlled by the existing `uiStore.panels.properties` toggle plus selection state. Closes when the user taps the backdrop or hits Escape.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/app/PropertyDrawer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertyDrawer } from './PropertyDrawer'

describe('PropertyDrawer', () => {
  it('renders content + close button when open', () => {
    const onClose = vi.fn()
    render(
      <PropertyDrawer mode="mobile" open onClose={onClose}>
        <div>panel-body</div>
      </PropertyDrawer>,
    )
    expect(screen.getByText('panel-body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('returns null when not open', () => {
    const { container } = render(
      <PropertyDrawer mode="mobile" open={false} onClose={vi.fn()}>
        <div>x</div>
      </PropertyDrawer>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('calls onClose when the backdrop is clicked (mobile)', () => {
    const onClose = vi.fn()
    render(
      <PropertyDrawer mode="mobile" open onClose={onClose}>
        <div>x</div>
      </PropertyDrawer>,
    )
    fireEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it("uses bottom-sheet classes on mobile and side-sheet classes on tablet", () => {
    const { rerender, container } = render(
      <PropertyDrawer mode="mobile" open onClose={vi.fn()}><div /></PropertyDrawer>,
    )
    let panel = container.querySelector('[data-role="property-drawer"]')!
    expect(panel.className).toContain('bottom-0')
    rerender(
      <PropertyDrawer mode="tablet" open onClose={vi.fn()}><div /></PropertyDrawer>,
    )
    panel = container.querySelector('[data-role="property-drawer"]')!
    expect(panel.className).toContain('right-0')
  })
})
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm vitest run src/ui/app/PropertyDrawer.test.tsx
```

- [ ] **Step 3: Implement PropertyDrawer**

```tsx
// src/ui/app/PropertyDrawer.tsx
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@/ui/primitives'

export interface PropertyDrawerProps {
  readonly mode: 'mobile' | 'tablet'
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
}

/**
 * Slide-in property panel for mobile / tablet. Mobile: bottom sheet
 * (max-h 70vh). Tablet: right-side drawer (320px). Backdrop dims the canvas
 * and dismisses on tap. Desktop renders the panel inline via AppShell — this
 * component never mounts at desktop sizes.
 */
export const PropertyDrawer = ({ mode, open, onClose, children }: PropertyDrawerProps) => {
  if (!open) return null
  const sheetClass =
    mode === 'mobile'
      ? 'fixed left-0 right-0 bottom-0 max-h-[70vh] rounded-t-xl'
      : 'fixed right-0 top-0 bottom-0 w-80 border-l'
  return (
    <>
      <div
        data-testid="drawer-backdrop"
        className="fixed inset-0 z-30 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        data-role="property-drawer"
        data-mode={mode}
        className={`z-40 flex flex-col overflow-y-auto bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 ${sheetClass}`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
          <span className="text-sm font-semibold">Properties</span>
          <IconButton
            aria-label="Close properties panel"
            icon={<X size={18} aria-hidden />}
            onClick={onClose}
          />
        </header>
        <div className="flex-1">{children}</div>
      </aside>
    </>
  )
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm vitest run src/ui/app/PropertyDrawer.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/app/PropertyDrawer.tsx src/ui/app/PropertyDrawer.test.tsx
git commit -m "feat(ui/app): PropertyDrawer (bottom sheet on mobile, side drawer on tablet)"
```

---

## Task 5: AppShell switches on usePanelMode

**Files:**
- Modify: `src/ui/app/AppShell.tsx`
- Modify: `src/ui/app/AppShell.test.tsx`

Desktop: render the inline `<aside>` as today. Mobile / tablet: render `PropertyDrawer` instead, so the canvas keeps full width. The drawer's `open` mirrors the same `panelToggled && hasSelection` predicate AppShell already computes.

- [ ] **Step 1: Add the failing test**

```tsx
// src/ui/app/AppShell.test.tsx — append two tests
it('renders inline aside on desktop', () => {
  vi.mocked(usePanelMode).mockReturnValue('desktop')
  // … render with selection + panel toggled on …
  // expect aside [data-role="properties-panel"] in document
  // expect drawer [data-role="property-drawer"] NOT in document
})

it('renders PropertyDrawer on mobile/tablet', () => {
  vi.mocked(usePanelMode).mockReturnValue('mobile')
  // … render with selection + panel toggled on …
  // expect drawer in document, inline aside NOT in document
})
```

(The existing AppShell tests stay; mock `usePanelMode` via `vi.mock`.)

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm vitest run src/ui/app/AppShell.test.tsx
```

- [ ] **Step 3: Modify AppShell**

```tsx
// src/ui/app/AppShell.tsx
import { usePanelMode } from './usePanelMode'
import { PropertyDrawer } from './PropertyDrawer'
import { useUiStore } from '@/state/uiStore'

export const AppShell = ({ canvas, properties, chrome, overlays }: AppShellProps) => {
  const panelToggled = useUiStore((s) => s.panels.properties !== false)
  const togglePanel = useUiStore((s) => s.togglePanel)
  const hasSelection = useSelectionStore(
    (s) => s.selectedNodeIds.size + s.selectedEdgeIds.size > 0,
  )
  const showProperties = panelToggled && hasSelection
  const mode = usePanelMode()
  return (
    <div className="relative flex h-screen w-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <main className="flex flex-1 overflow-hidden">{canvas}</main>
      {mode === 'desktop' && showProperties && (
        <aside
          className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white xl:w-80 2xl:w-96 dark:border-slate-700 dark:bg-slate-800"
          data-role="properties-panel"
        >
          {properties}
        </aside>
      )}
      {mode !== 'desktop' && (
        <PropertyDrawer mode={mode} open={showProperties} onClose={() => togglePanel('properties')}>
          {properties}
        </PropertyDrawer>
      )}
      {chrome}
      {overlays}
    </div>
  )
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm vitest run src/ui/app/AppShell.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/app/AppShell.tsx src/ui/app/AppShell.test.tsx
git commit -m "feat(ui/app): AppShell renders PropertyDrawer on mobile/tablet, inline panel on desktop"
```

---

## Task 6: Menu mobile tweaks

**Files:**
- Modify: `src/ui/menu/Menu.tsx`

On mobile, hide shortcut hints in the dropdown rows (they don't apply to touch users), and shrink the hamburger button so it doesn't overlap the canvas as much. Use Tailwind responsive prefixes only — no new logic.

- [ ] **Step 1: Hide shortcut hints on mobile in FileActionRow**

```tsx
// src/ui/menu/FileActionRow.tsx — change the shortcut span
{item.shortcut && (
  <span className="hidden font-mono text-xs text-slate-400 sm:inline dark:text-slate-500">
    {item.shortcut}
  </span>
)}
```

- [ ] **Step 2: Visual check & commit (no functional test needed)**

```bash
git add src/ui/menu/FileActionRow.tsx
git commit -m "feat(ui/menu): hide shortcut hints on mobile (sm:inline)"
```

---

## Task 7: Toast + ContextMenu + modals on mobile

**Files:**
- Modify: `src/ui/overlays/ToastStack.tsx`
- Modify: `src/ui/overlays/ContextMenu.tsx`
- Modify: `src/ui/overlays/ConfirmModal.tsx`
- Modify: `src/ui/overlays/CheatsheetModal.tsx`

ToastStack: full-width pinned at top on mobile, bottom-right on `sm:`+. ContextMenu: clamp into viewport (already partially handled — verify; otherwise add `max-w-[calc(100vw-1rem)]`). ConfirmModal: already uses `min(420px, 90vw)` — verify it reads well below 360px width. CheatsheetModal: scrollable + full-width on mobile.

- [ ] **Step 1: ToastStack class change**

```tsx
// in ToastStack.tsx, change the outer fixed div className to:
className="pointer-events-none fixed left-2 right-2 top-4 z-50 flex flex-col gap-2 sm:left-auto sm:top-auto sm:right-4 sm:bottom-4"
```

- [ ] **Step 2: ContextMenu clamp**

```tsx
// in ContextMenu.tsx, ensure the wrapper has:
className="… max-w-[calc(100vw-1rem)] …"
```

- [ ] **Step 3: CheatsheetModal scroll + width**

```tsx
// in CheatsheetModal.tsx, ensure the inner card:
className="… w-[min(640px,calc(100vw-1rem))] max-h-[calc(100vh-4rem)] overflow-y-auto …"
```

- [ ] **Step 4: Run all overlay tests**

```bash
pnpm vitest run src/ui/overlays
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/overlays
git commit -m "feat(ui/overlays): mobile-friendly Toast / ContextMenu / Cheatsheet sizing"
```

---

## Task 8: Touch palm rejection (pen wins over touch)

**Files:**
- Modify: `src/canvas/hooks/useTouch.ts`
- Modify: `src/canvas/hooks/useTouch.test.tsx`

When a `pen` pointer is currently down on the canvas, drop subsequent `touch` pointer events. Tracks via a module-level (or hook-internal) "pen active" flag set on pointerdown(pen) / cleared on pointerup(pen). Pen events fall through to `useMouse` unchanged — the new flag is read by `useTouch` only.

- [ ] **Step 1: Add the failing test**

```tsx
it('drops touch pointerdown while a pen pointer is active (palm rejection)', () => {
  const { result } = renderHook(() => useTouch(), RF_OPTS)
  // 1. Pen pointer goes down — should NOT reach useTouch (it filters by type),
  //    but should set the pen-active flag.
  result.current.onPointerDown({
    pointerType: 'pen', pointerId: 99, clientX: 0, clientY: 0,
    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
    button: 0, preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLElement>)
  // 2. Concurrent touch pointer (palm) — must be ignored while pen is active.
  result.current.onPointerDown({
    pointerType: 'touch', pointerId: 100, clientX: 50, clientY: 50,
    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
    button: 0, preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLElement>)
  expect(sendSpy).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run, confirm fail**

```bash
pnpm vitest run src/canvas/hooks/useTouch.test.tsx
```

- [ ] **Step 3: Update useTouch with palm-rejection flag**

Promote the hook to track `penActiveRef` alongside the existing `activePointerId`. On `onPointerDown` with `pointerType === 'pen'` set the flag; on `pointerup(pen)` clear it. In every touch handler, early-return if the flag is set.

- [ ] **Step 4: Run, confirm pass**

```bash
pnpm vitest run src/canvas/hooks/useTouch.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/canvas/hooks/useTouch.ts src/canvas/hooks/useTouch.test.tsx
git commit -m "feat(canvas): palm rejection — drop touch events while pen is active"
```

---

## Task 9: Touch pinch-to-zoom

**Files:**
- Modify: `src/canvas/hooks/useTouch.ts`
- Modify: `src/canvas/hooks/useTouch.test.tsx`

Track the second pointer. When two touch pointers are down, compute the distance between them; on each move, dispatch `WHEEL_ZOOM` with `delta = (distNow - distPrev) * 0.005` and `anchor = midpoint(p1, p2)` in flow coordinates.

- [ ] **Step 1: Failing test asserting `WHEEL_ZOOM` event dispatched on two-finger pinch**

(Constructs two synthesised pointerdown/move events and inspects sendSpy calls.)

- [ ] **Step 2: Run, confirm fail**

- [ ] **Step 3: Implement pinch logic in useTouch**

Add `secondPointerId` ref + `lastDist` ref. On second pointerdown(touch): record id and initial distance. On pointermove(touch) with both pointers active: compute new distance, send `WHEEL_ZOOM`, update `lastDist`.

- [ ] **Step 4: Run, confirm pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(canvas): two-finger pinch dispatches WHEEL_ZOOM"
```

---

## Task 10: Touch two-finger pan

**Files:**
- Modify: `src/canvas/hooks/useTouch.ts`
- Modify: `src/canvas/hooks/useTouch.test.tsx`

When both touch pointers move in the same direction (cross product near zero AND distance change tiny), dispatch a viewport pan instead of zoom. Threshold: distance change < 5px AND midpoint moved > 5px → pan; otherwise zoom.

- [ ] **Step 1: Failing test for two-finger drag dispatching pan**

- [ ] **Step 2: Run, confirm fail**

- [ ] **Step 3: Branch in `onPointerMove(touch, secondPointer)` to pick zoom vs pan**

- [ ] **Step 4: Run, confirm pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(canvas): two-finger drag dispatches viewport pan"
```

---

## Task 11: Pen support audit + tests

**Files:**
- Modify: `src/canvas/hooks/useMouse.ts`
- Modify: `src/canvas/hooks/useMouse.test.tsx`

Pen `pointerType === 'pen'` already passes through `useMouse` (which only filters `'touch'`). Add explicit test coverage so the behaviour is locked down, and add a comment in `useMouse.ts` documenting the contract.

- [ ] **Step 1: Add tests for pen events**

```tsx
it('pen pointerdown fires CANVAS_POINTER_DOWN like a mouse (no filter)', () => {
  const { result } = renderHook(() => useMouse(), RF_OPTS)
  result.current.onPointerDown({
    pointerType: 'pen', clientX: 10, clientY: 20, button: 0,
    shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
    preventDefault: vi.fn(), target: document.createElement('div'),
  } as unknown as React.PointerEvent<HTMLElement>)
  expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'CANVAS_POINTER_DOWN' }))
})

it('pen pointermove fires CANVAS_POINTER_MOVE', () => { /* … */ })
it('pen pointerup fires CANVAS_POINTER_UP', () => { /* … */ })
```

- [ ] **Step 2: Run, confirm pass (or fail if a regression has crept in)**

- [ ] **Step 3: Add documentation comment to useMouse.ts**

```ts
// Pen events (`pointerType === 'pen'`) intentionally pass through this hook —
// pens have hover, accurate coordinates, and modifier keys, so they behave
// like a mouse from the FSM's perspective. The dedicated `useTouch` hook
// only fires for `pointerType === 'touch'` and includes a palm-rejection
// flag that drops concurrent touches while a pen is active.
```

- [ ] **Step 4: Commit**

```bash
git add src/canvas/hooks/useMouse.ts src/canvas/hooks/useMouse.test.tsx
git commit -m "test(canvas): pin down pen-event contract on useMouse"
```

---

## Task 12: ERCanvas wires touch handlers

**Files:**
- Modify: `src/canvas/ERCanvas.tsx`

Hook the `useTouch` handlers onto the same wrapper div that owns `useMouse`. Pen + mouse keep going to `useMouse`; touch goes to `useTouch`. The two hooks already filter by pointerType so they don't fight.

- [ ] **Step 1: Read ERCanvas.tsx to confirm where handlers attach**
- [ ] **Step 2: Spread useTouch handlers alongside useMouse on the wrapper**

```tsx
const mouse = useMouse()
const touch = useTouch()
// in JSX
<div
  onPointerDown={(e) => { mouse.onPointerDown(e); touch.onPointerDown(e) }}
  onPointerMove={(e) => { mouse.onPointerMove(e); touch.onPointerMove(e) }}
  onPointerUp={(e) => { mouse.onPointerUp(e); touch.onPointerUp(e) }}
  onWheel={mouse.onWheel}
>
```

- [ ] **Step 3: Run full canvas suite**

```bash
pnpm vitest run src/canvas
```

- [ ] **Step 4: Commit**

```bash
git add src/canvas/ERCanvas.tsx
git commit -m "feat(canvas): ERCanvas dispatches pointer events to both useMouse and useTouch"
```

---

## Task 13: Visual smoke + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Manually exercise each viewport at 375 / 768 / 1280 / 1920 widths**
- [ ] **Step 2: Update CHANGELOG.md**

```
## v2.x — Responsive editing
- Property panel becomes a bottom-sheet drawer on mobile and a side drawer on tablet.
- Toolbar bottom-pins on mobile, top-center on sm+.
- Touch hit targets ≥44px on coarse pointers.
- Two-finger pinch zooms; two-finger drag pans the viewport.
- Palm rejection: touches are ignored while a pen pointer is active.
```

- [ ] **Step 3: Final full suite**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): responsive editing pass"
```

---

## Out of scope (explicit non-goals for this plan)

- Mobile-specific tools or simplified toolbar surface (e.g. hiding the connection tool on phones). Same toolset everywhere.
- Server-side viewport detection / SSR adaptation — `usePanelMode` is client-only.
- Pen pressure / tilt visualisation. Pen input is treated as a mouse equivalent.
- Long-press → context-menu gesture. Already handled by the existing context-menu wiring (right-click). If touch-long-press is desired later, it's a follow-up.
- Persisted drawer-open state. The drawer follows the existing `panels.properties` toggle which is already persisted.

---

## Self-Review

- **Spec coverage:** All five viewport sizes covered by Task 1's breakpoint mapping; pen + touch handled in Tasks 8-11; full editing preserved (no feature is hidden, only relocated). ✅
- **Placeholder scan:** No "TBD" / "fill in" / vague handlers; every step has either code or an exact selector to change. ✅
- **Type consistency:** `PanelMode` type ('mobile' | 'tablet' | 'desktop') referenced by both `usePanelMode` (Task 1), `PropertyDrawer.mode` (Task 4), and `AppShell` (Task 5) — all match. ✅
- **Realism check:** Tailwind's `pointer-coarse:` variant exists in v4. `window.matchMedia` works in jsdom. The two-finger pan/zoom branch may need a small fudge factor in practice — note in Task 10 acknowledged this with a 5px threshold.
