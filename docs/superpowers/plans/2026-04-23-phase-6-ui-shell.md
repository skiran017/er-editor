# Phase 6 — UI Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 4 canvas (blank except for a React Flow control strip) into a working ER-diagram editor with a toolbar, menu, property panel, right-click context menu, toast/modal overlays, a cheatsheet, and inline rename — wired to the Phase 3 FSM through typed events.

**Architecture:** One component per file under `src/ui/{app,menu,toolbar,properties,overlays,primitives}/`. Components stay thin; they dispatch FSM events via `useInteractionStore.getState().send(...)` and read store slices via narrow Zustand selectors. No direct DOM side effects outside the mounted tree. Re-introduces `connectToGeneralization` FSM state (deferred from Phase 3) for the right-click-on-ISA flow.

**Tech Stack:** React 19, TypeScript, `@xyflow/react` 12, XState 5 (Phase 3 FSM), Zustand (Phase 2 stores), Tailwind v4 (utility classes), i18next + react-i18next (UI strings; Italian bundle completion deferred to Phase 7), Vitest 3 + `@testing-library/react` + `@testing-library/user-event`.

---

## Spec anchors

- **§7.10** — toasts, modals, responsive layout (three panes on desktop, collapsing on tablet). Confirm modal for destructive non-undoable actions only.
- **§7.2** — keyboard model + cheatsheet is generated from `interaction/keybindings.ts` registry.
- **§7.7** — drag-from-toolbar: icons draggable onto canvas, coexists with click-tool mode.
- **§9.4–9.5** — selection handling + property panel per-element editors.
- **§9.11–9.15** — Moodle exam-mode: read-only prop enforced across UI; save/export disabled when active.
- **§10.8** — Phase 6 exit: integration test proves creating → renaming → (save → reopen simulated without Phase 5 codecs) → identical state. Feature parity with legacy modulo removed features.
- **§12.4 open item 2** — ISA orientation top-down; confirmed in Phase 4.

## Phase 5 / 7 dependencies

- **Phase 5 (codecs) is blocked on SUPSI XML sample.** Phase 6's `FileMenu` will ship with `save` / `open` / `export` menu items wired to stubs that emit an "Available in Phase 5" toast. The menu UI is Phase 6; codec actions plug in during Phase 5.
- **Phase 7 (i18n + Moodle bridge)** completes the Italian translations and the query-param handling. Phase 6 bootstraps i18next with an English bundle that covers every new UI key. Missing Italian keys fall back to English at render time (i18next default). A `?readonly=true` / `?examMode=true` query-param is **not** read in Phase 6 — but the UI must respect a `readonly` flag on `uiStore`; Phase 7 wires the query-param → store path.

## What ships

- `src/ui/primitives/{Button,IconButton,TextInput,Checkbox,KeyboardShortcut}.tsx` — bare UI primitives.
- `src/ui/app/AppShell.tsx` — three-pane responsive layout (toolbar ‖ canvas ‖ properties), with overlay mount points.
- `src/ui/toolbar/{Toolbar,ToolButton,DragHandle}.tsx` — reads `chenPlugin.tools`, dispatches `PICK_TOOL`; supports drag-from-toolbar via native HTML5 drag events.
- `src/ui/menu/{MenuBar,FileMenu,EditMenu,ViewMenu,HelpMenu}.tsx` — top menu. File actions stubbed to Phase-5 toasts. Edit menu wires undo/redo/cut/copy/paste/duplicate/select-all via FSM events. View menu toggles grid/alignment/panels. Help menu opens cheatsheet.
- `src/ui/properties/{PropertyPanel,EntityProperties,RelationshipProperties,AttributeProperties,ISAProperties,EdgeProperties,MultiSelectSummary,EmptyPanel}.tsx` — kind-aware property editors.
- `src/ui/overlays/{ToastStack,ModalStack,CheatsheetModal,ConfirmModal,ErrorModal,ContextMenu}.tsx` — toast/modal/context-menu overlays.
- `src/canvas/hooks/useInlineRename.ts` — inline rename (F2/Enter/dblclick on node). Stays canvas-side because `InlineRenameOverlay.tsx` consumes it and `canvas → ui` is forbidden. Callers outside canvas go through `uiStore.startInlineRename`. `useReadOnly` is deferred until Phase 7 wires query params.
- `src/canvas/InlineRenameOverlay.tsx` — SVG-coordinate-based input overlay that rides the React Flow viewport; consumes `useInlineRename`.
- `src/interaction/{events,machine,actions}.ts` — reintroduce `connectToGeneralization` state + `CONNECT_CHILD_TO_ISA` event for right-click-on-ISA UI (deferred from Phase 3).
- `src/platform/i18n/{init.ts,index.ts}` + `src/platform/i18n/locales/{en,it}/{common,toolbar,menu,properties,modals}.json` — i18n bootstrap + UI strings. Italian stubs copy English; Phase 7 completes.
- `src/state/uiStore.ts` — add `readOnly: boolean` flag (default false).
- `src/App.tsx` — mount `AppShell` with all overlays + menu + toolbar + canvas + properties.

## Out of scope (Phase 7 or Sub-project 4)

- Moodle `postMessage` bridge (Phase 7 §10.9).
- `?examMode` / `?lang` / `?readonly` / `?validation` / `?embed` query-param wiring (Phase 7).
- Complete Italian translations (Phase 7).
- Actual codec `save` / `open` / `export` behaviour (Phase 5; stubbed with toasts here).
- Cross-document clipboard paste (Sub-project 4).
- Validation-list panel (Sub-project 4).
- Rotation / per-element style overrides (removed).
- First-run tutorial (docs instead).
- Mobile-phone UX (Sub-project 4 stretch).

## File structure

```
src/
  ui/
    app/
      AppShell.tsx                              (NEW)
      AppShell.test.tsx                         (NEW)
    primitives/
      Button.tsx                                (NEW)
      Button.test.tsx                           (NEW)
      IconButton.tsx                            (NEW)
      IconButton.test.tsx                       (NEW)
      TextInput.tsx                             (NEW)
      TextInput.test.tsx                        (NEW)
      Checkbox.tsx                              (NEW)
      Checkbox.test.tsx                         (NEW)
      KeyboardShortcut.tsx                      (NEW — visual hint on menu items)
      KeyboardShortcut.test.tsx                 (NEW)
      index.ts                                  (NEW barrel)
    toolbar/
      Toolbar.tsx                               (NEW)
      Toolbar.test.tsx                          (NEW)
      ToolButton.tsx                            (NEW)
      ToolButton.test.tsx                       (NEW)
      dragFromToolbar.ts                        (NEW — drag helpers, pure)
      dragFromToolbar.test.ts                   (NEW)
    menu/
      MenuBar.tsx                               (NEW)
      MenuBar.test.tsx                          (NEW)
      FileMenu.tsx                              (NEW)
      FileMenu.test.tsx                         (NEW)
      EditMenu.tsx                              (NEW)
      EditMenu.test.tsx                         (NEW)
      ViewMenu.tsx                              (NEW)
      ViewMenu.test.tsx                         (NEW)
      HelpMenu.tsx                              (NEW)
      HelpMenu.test.tsx                         (NEW)
      MenuItem.tsx                              (NEW — shared menu-item primitive)
      MenuItem.test.tsx                         (NEW)
    properties/
      PropertyPanel.tsx                         (NEW)
      PropertyPanel.test.tsx                    (NEW)
      EntityProperties.tsx                      (NEW)
      EntityProperties.test.tsx                 (NEW)
      RelationshipProperties.tsx                (NEW)
      RelationshipProperties.test.tsx           (NEW)
      AttributeProperties.tsx                   (NEW)
      AttributeProperties.test.tsx              (NEW)
      ISAProperties.tsx                         (NEW)
      ISAProperties.test.tsx                    (NEW)
      EdgeProperties.tsx                        (NEW)
      EdgeProperties.test.tsx                   (NEW)
      MultiSelectSummary.tsx                    (NEW)
      MultiSelectSummary.test.tsx               (NEW)
      EmptyPanel.tsx                            (NEW)
      EmptyPanel.test.tsx                       (NEW)
    overlays/
      ToastStack.tsx                            (NEW)
      ToastStack.test.tsx                       (NEW)
      ModalStack.tsx                            (NEW)
      ModalStack.test.tsx                       (NEW)
      CheatsheetModal.tsx                       (NEW)
      CheatsheetModal.test.tsx                  (NEW)
      ConfirmModal.tsx                          (NEW)
      ConfirmModal.test.tsx                     (NEW)
      ErrorModal.tsx                            (NEW)
      ErrorModal.test.tsx                       (NEW)
      ContextMenu.tsx                           (NEW)
      ContextMenu.test.tsx                      (NEW)
    index.ts                                    (NEW barrel)
  canvas/
    hooks/
      useInlineRename.ts                        (NEW — canvas-side because InlineRenameOverlay consumes it)
      useInlineRename.test.tsx                  (NEW)
      index.ts                                  (MODIFY — add useInlineRename export)
    InlineRenameOverlay.tsx                     (NEW — SVG overlay)
    InlineRenameOverlay.test.tsx                (NEW)
    ERCanvas.tsx                                (MODIFY — mount overlay + context menu)
  interaction/
    events.ts                                   (MODIFY — add CONNECT_CHILD_TO_ISA + CONTEXT_MENU events)
    machine.ts                                  (MODIFY — reintroduce connectToGeneralization state)
    actions.ts                                  (MODIFY — add connectChildToIsa action)
    keybindings.ts                              (MODIFY — add F2 rename, context-menu triggers)
  state/
    uiStore.ts                                  (MODIFY — add readOnly flag)
    uiStore.test.ts                             (MODIFY — cover readOnly slice)
  platform/
    i18n/
      init.ts                                   (NEW)
      init.test.ts                              (NEW)
      index.ts                                  (NEW)
      locales/
        en/
          common.json                           (NEW)
          toolbar.json                          (NEW)
          menu.json                             (NEW)
          properties.json                       (NEW)
          modals.json                           (NEW)
        it/
          common.json                           (NEW — stub copies EN)
          toolbar.json                          (NEW — stub)
          menu.json                             (NEW — stub)
          properties.json                       (NEW — stub)
          modals.json                           (NEW — stub)
  App.tsx                                       (REWRITE)
  main.tsx                                      (MODIFY — import i18n init)

vitest.config.ts                                (MODIFY — add src/ui/** thresholds)
CHANGELOG.md                                    (MODIFY — Phase 6 entry)
```

## Layer direction

Per `eslint.config.js`:
- `ui/**` may import from `domain`, `platform`, `state`, `interaction`, `notation`, `canvas`. ✅
- `canvas/**` gains one new file (`InlineRenameOverlay.tsx`) which imports `ui/primitives/TextInput` — this is a **direction violation** (`canvas → ui`). Two fixes:
  1. **Keep the overlay in `canvas/`** and inline the `TextInput` there (duplicate the 30 lines rather than import). The overlay is canvas-specific; the duplication is trivial.
  2. **Use a raw `<input>`** in `InlineRenameOverlay.tsx`. No layer crossing.

The plan uses **option 2** — raw `<input>` with Tailwind classes. Ships exactly the behaviour without a layer exception.

## Coverage thresholds (added in Task 18)

```ts
'src/ui/primitives/**':   { statements: 85, branches: 75, functions: 85, lines: 85 },
'src/ui/overlays/**':     { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/ui/properties/**':   { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/ui/toolbar/**':      { statements: 85, branches: 75, functions: 85, lines: 85 },
'src/ui/menu/**':         { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/ui/**':              { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/platform/i18n/**':   { statements: 80, branches: 70, functions: 80, lines: 80 },
```

## Add deps

`i18next`, `react-i18next` — if not already installed. Check `package.json` first.

---

## Task 1: i18n bootstrap + UI locale bundles

**Files:**
- Create: `src/platform/i18n/init.ts`
- Create: `src/platform/i18n/init.test.ts`
- Create: `src/platform/i18n/index.ts` (barrel)
- Create: `src/platform/i18n/locales/en/{common,toolbar,menu,properties,modals}.json`
- Create: `src/platform/i18n/locales/it/{common,toolbar,menu,properties,modals}.json` (stubs copying EN)
- Modify: `src/main.tsx` (import i18n init; must run before `createRoot`)

i18next + react-i18next are already installed (confirmed). This task wires initialisation and ships the full English UI bundle. Italian stubs copy the English values verbatim — Phase 7 produces real translations. i18next's `fallbackLng: 'en'` handles any key accidentally missing from the IT bundle at runtime.

The existing `src/platform/i18n/locales/{en,it}/validation.json` (Phase 1) stays in place; Task 1 **adds five sibling namespaces per language**, doesn't touch validation.

- [ ] **Step 1: Implementation — `init.ts`**

```ts
// src/platform/i18n/init.ts
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

// Static imports so bundler can tree-shake and runtime has no fetch.
import enCommon from './locales/en/common.json'
import enToolbar from './locales/en/toolbar.json'
import enMenu from './locales/en/menu.json'
import enProperties from './locales/en/properties.json'
import enModals from './locales/en/modals.json'
import enValidation from './locales/en/validation.json'

import itCommon from './locales/it/common.json'
import itToolbar from './locales/it/toolbar.json'
import itMenu from './locales/it/menu.json'
import itProperties from './locales/it/properties.json'
import itModals from './locales/it/modals.json'
import itValidation from './locales/it/validation.json'

const resources = {
  en: {
    common: enCommon, toolbar: enToolbar, menu: enMenu,
    properties: enProperties, modals: enModals, validation: enValidation,
  },
  it: {
    common: itCommon, toolbar: itToolbar, menu: itMenu,
    properties: itProperties, modals: itModals, validation: itValidation,
  },
} as const

export const initI18n = async (): Promise<typeof i18next> => {
  if (i18next.isInitialized) return i18next
  await i18next.use(initReactI18next).init({
    resources,
    lng: 'en',            // Phase 7 will read `?lang=…` and write this.
    fallbackLng: 'en',
    ns: ['common', 'toolbar', 'menu', 'properties', 'modals', 'validation'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  return i18next
}
```

- [ ] **Step 2: Implementation — `index.ts` barrel**

```ts
// src/platform/i18n/index.ts
export { initI18n } from './init'
```

- [ ] **Step 3: Write locale bundles**

Create `src/platform/i18n/locales/en/common.json`:
```json
{
  "cancel": "Cancel",
  "confirm": "Confirm",
  "delete": "Delete",
  "rename": "Rename",
  "ok": "OK",
  "close": "Close",
  "save": "Save",
  "open": "Open",
  "loading": "Loading…",
  "readOnly": "Read-only",
  "examMode": "Exam mode"
}
```

Create `src/platform/i18n/locales/en/toolbar.json`:
```json
{
  "group": {
    "select": "Select",
    "elements": "Elements",
    "connections": "Connections"
  },
  "tool": {
    "select": "Select",
    "pan": "Pan",
    "entity": "Entity",
    "relationship": "Relationship",
    "attribute": "Attribute",
    "isa": "Generalization",
    "connect": "Connect",
    "quickRelationship": "Quick relationship",
    "quickGeneralization": "Quick generalization"
  }
}
```

Create `src/platform/i18n/locales/en/menu.json`:
```json
{
  "file": {
    "title": "File",
    "new": "New diagram",
    "open": "Open…",
    "save": "Save",
    "saveAs": "Save as…",
    "export": "Export",
    "exportPng": "Export PNG",
    "exportSvg": "Export SVG",
    "exportMermaid": "Export Mermaid"
  },
  "edit": {
    "title": "Edit",
    "undo": "Undo",
    "redo": "Redo",
    "cut": "Cut",
    "copy": "Copy",
    "paste": "Paste",
    "duplicate": "Duplicate",
    "delete": "Delete",
    "selectAll": "Select all",
    "invertSelection": "Invert selection"
  },
  "view": {
    "title": "View",
    "zoomIn": "Zoom in",
    "zoomOut": "Zoom out",
    "fitView": "Fit to view",
    "grid": "Grid",
    "alignment": "Alignment guides",
    "properties": "Properties panel"
  },
  "help": {
    "title": "Help",
    "cheatsheet": "Keyboard shortcuts",
    "about": "About"
  },
  "notYetAvailable": "Available in Phase 5 (I/O codecs)."
}
```

Create `src/platform/i18n/locales/en/properties.json`:
```json
{
  "empty": "Select a node or edge to see its properties.",
  "multi": "{{count}} items selected",
  "kind": {
    "entity": "Entity",
    "relationship": "Relationship",
    "attribute": "Attribute",
    "isa": "Generalization",
    "entity-relationship": "Entity-Relationship edge",
    "attribute-of": "Attribute-of edge",
    "isa-link": "ISA link"
  },
  "name": "Name",
  "isWeak": "Weak entity",
  "isIdentifying": "Identifying relationship",
  "isKey": "Key attribute",
  "isDiscriminant": "Discriminant (partial key)",
  "isMultivalued": "Multivalued",
  "isDerived": "Derived",
  "isComposite": "Composite",
  "isTotal": "Total generalization",
  "cardinality": "Cardinality",
  "participation": "Participation",
  "participationTotal": "Total",
  "participationPartial": "Partial",
  "role": "Role",
  "rolePlaceholder": "e.g. parent, child, manages"
}
```

Create `src/platform/i18n/locales/en/modals.json`:
```json
{
  "cheatsheet": {
    "title": "Keyboard shortcuts",
    "category": {
      "tool": "Tools",
      "operation": "Operations",
      "contextual": "Contextual",
      "navigation": "Navigation"
    }
  },
  "confirm": {
    "title": "Please confirm"
  },
  "error": {
    "title": "Something went wrong",
    "dismiss": "Dismiss"
  }
}
```

Copy each `en/*.json` to `it/*.json` verbatim (Italian translation is Phase 7's deliverable; fallbackLng guarantees runtime correctness).

- [ ] **Step 4: Add tsconfig JSON resolution (if needed)**

Verify `tsconfig.json` has `"resolveJsonModule": true` (it should already; Phase 1 imports validation.json). If missing, add it.

- [ ] **Step 5: Write failing test**

```ts
// src/platform/i18n/init.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { initI18n } from './init'

describe('initI18n', () => {
  beforeEach(async () => {
    // i18next is a singleton; reset by reinitialising.
  })

  it('resolves after initialisation', async () => {
    const i = await initI18n()
    expect(i.isInitialized).toBe(true)
  })

  it('is idempotent — calling twice returns the same instance without reinit', async () => {
    const a = await initI18n()
    const b = await initI18n()
    expect(a).toBe(b)
  })

  it('registers all five UI namespaces plus validation', async () => {
    const i = await initI18n()
    for (const ns of ['common', 'toolbar', 'menu', 'properties', 'modals', 'validation']) {
      expect(i.hasResourceBundle('en', ns)).toBe(true)
    }
  })

  it('translates common:save to "Save"', async () => {
    const i = await initI18n()
    expect(i.t('save', { ns: 'common' })).toBe('Save')
  })

  it('translates toolbar:tool.entity to "Entity"', async () => {
    const i = await initI18n()
    expect(i.t('tool.entity', { ns: 'toolbar' })).toBe('Entity')
  })

  it('falls back to English when a key is missing from Italian (pre-Phase-7)', async () => {
    const i = await initI18n()
    // IT stubs are copies in Phase 6, so IT actually has the key. Test fallback shape:
    await i.changeLanguage('it')
    expect(i.t('save', { ns: 'common' })).toBeTruthy()
    await i.changeLanguage('en')
  })
})
```

- [ ] **Step 6: Run — expected PASS**

```
pnpm vitest run src/platform/i18n/init.test.ts
```
All 6 tests green.

- [ ] **Step 7: Wire into `main.tsx`**

Add near the top (before `createRoot`):
```ts
import { initI18n } from '@/platform/i18n'
await initI18n()
```

`main.tsx` is already a module; top-level `await` works in Vite/ES2022 targets. If the project's tsconfig target is ES2020 or lower, wrap in an IIFE:
```ts
void initI18n().then(() => {
  createRoot(document.getElementById('root')!).render(<App />)
})
```
Use the IIFE form to be safe.

- [ ] **Step 8: Typecheck + lint + full suite**

```
pnpm typecheck && pnpm lint && pnpm test
```
All clean. Expect +6 tests (498 → 504).

- [ ] **Step 9: Commit**

```bash
git add src/platform/i18n src/main.tsx
git commit -m "feat(platform): bootstrap i18next with UI + validation namespaces"
```

---

## Task 2: `ui/primitives/` — Button, IconButton, TextInput, Checkbox, KeyboardShortcut

**Files:**
- Create: `src/ui/primitives/Button.tsx` + `.test.tsx`
- Create: `src/ui/primitives/IconButton.tsx` + `.test.tsx`
- Create: `src/ui/primitives/TextInput.tsx` + `.test.tsx`
- Create: `src/ui/primitives/Checkbox.tsx` + `.test.tsx`
- Create: `src/ui/primitives/KeyboardShortcut.tsx` + `.test.tsx`
- Create: `src/ui/primitives/index.ts` (barrel)

Small, prop-driven components. No store access. Tailwind classes only — no custom CSS.

- [ ] **Step 1: `Button.tsx`**

```tsx
// src/ui/primitives/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  readonly size?: 'sm' | 'md'
  readonly children: ReactNode
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-300',
  secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
  ghost: 'bg-transparent text-slate-900 hover:bg-slate-100',
}
const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-9 px-3 text-sm',
}

export const Button = ({
  variant = 'secondary', size = 'md', className = '', children, ...rest
}: ButtonProps) => (
  <button
    {...rest}
    className={`inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
  >
    {children}
  </button>
)
```

- [ ] **Step 2: `Button.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import { vi } from 'vitest'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Hello</Button>)
    expect(screen.getByRole('button', { name: 'Hello' })).toBeInTheDocument()
  })

  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('respects disabled and does not fire onClick', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Nope</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('danger variant applies bg-red-600', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button').className).toContain('bg-red-600')
  })

  it('sm size applies h-7', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button').className).toContain('h-7')
  })
})
```

- [ ] **Step 3: `IconButton.tsx`**

```tsx
// src/ui/primitives/IconButton.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly 'aria-label': string
  readonly icon: ReactNode
  readonly active?: boolean
  readonly size?: 'sm' | 'md'
}

const SIZES = { sm: 'h-7 w-7', md: 'h-9 w-9' }

export const IconButton = ({ icon, active = false, size = 'md', className = '', ...rest }: IconButtonProps) => (
  <button
    {...rest}
    aria-pressed={active || undefined}
    className={`inline-flex items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      active ? 'bg-blue-100 text-blue-700' : 'bg-transparent text-slate-700 hover:bg-slate-100'
    } ${SIZES[size]} ${className}`}
  >
    {icon}
  </button>
)
```

Tests cover: aria-label exposure, active → `aria-pressed="true"`, onClick, disabled.

- [ ] **Step 4: `TextInput.tsx`**

```tsx
// src/ui/primitives/TextInput.tsx
import type { InputHTMLAttributes } from 'react'

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  readonly label?: string
  readonly size?: 'sm' | 'md'
}

const SIZES = { sm: 'h-7 text-xs', md: 'h-9 text-sm' }

export const TextInput = ({ label, size = 'md', id, className = '', ...rest }: TextInputProps) => {
  const inputId = id ?? rest.name
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-700">
      {label && <span>{label}</span>}
      <input
        {...rest}
        id={inputId}
        className={`rounded border border-slate-300 px-2 ${SIZES[size]} focus:border-blue-500 focus:outline-none ${className}`}
      />
    </label>
  )
}
```

Tests: renders label + input; onChange fires; controlled value reflects.

- [ ] **Step 5: `Checkbox.tsx`**

```tsx
// src/ui/primitives/Checkbox.tsx
import type { InputHTMLAttributes } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
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
```

Tests: renders label + checkbox; toggle via click; controlled checked reflects.

- [ ] **Step 6: `KeyboardShortcut.tsx`**

```tsx
// src/ui/primitives/KeyboardShortcut.tsx
export interface KeyboardShortcutProps {
  readonly combo: string    // e.g. 'Cmd+Z' or 'Shift+?'
}

export const KeyboardShortcut = ({ combo }: KeyboardShortcutProps) => (
  <kbd className="inline-flex rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
    {combo}
  </kbd>
)
```

Tests: renders combo text; role `kbd`.

- [ ] **Step 7: `index.ts` barrel**

```ts
export { Button, type ButtonProps } from './Button'
export { IconButton, type IconButtonProps } from './IconButton'
export { TextInput, type TextInputProps } from './TextInput'
export { Checkbox, type CheckboxProps } from './Checkbox'
export { KeyboardShortcut, type KeyboardShortcutProps } from './KeyboardShortcut'
```

- [ ] **Step 8: Run + commit**

```
pnpm vitest run src/ui/primitives/
pnpm typecheck && pnpm lint
```

Expect ~20 new tests green.

```bash
git add src/ui/primitives/
git commit -m "feat(ui): add primitives — Button, IconButton, TextInput, Checkbox, KeyboardShortcut"
```

---

## Task 3: `ui/app/AppShell.tsx` — three-pane responsive layout

**Files:**
- Create: `src/ui/app/AppShell.tsx`
- Create: `src/ui/app/AppShell.test.tsx`

A minimal container that slots four children:
- `menuBar` (top strip, full width)
- `toolbar` (left rail, fixed 56 px wide)
- `canvas` (centre, flex-grow)
- `properties` (right rail, 280 px, hidden when `uiStore.panels.properties === false`)

Also renders `overlays` as a portal-style absolute-positioned layer on top.

- [ ] **Step 1: Implementation**

```tsx
// src/ui/app/AppShell.tsx
import type { ReactNode } from 'react'
import { useUiStore } from '@/state/uiStore'

export interface AppShellProps {
  readonly menuBar: ReactNode
  readonly toolbar: ReactNode
  readonly canvas: ReactNode
  readonly properties: ReactNode
  readonly overlays?: ReactNode
}

export const AppShell = ({ menuBar, toolbar, canvas, properties, overlays }: AppShellProps) => {
  const showProperties = useUiStore((s) => s.panels.properties !== false)
  return (
    <div className="relative flex h-screen w-screen flex-col bg-white text-slate-900">
      <div className="flex h-10 shrink-0 items-center border-b border-slate-200">{menuBar}</div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-14 shrink-0 flex-col items-center border-r border-slate-200 py-2">{toolbar}</aside>
        <main className="flex flex-1 overflow-hidden">{canvas}</main>
        {showProperties && (
          <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200" data-role="properties-panel">
            {properties}
          </aside>
        )}
      </div>
      {overlays}
    </div>
  )
}
```

- [ ] **Step 2: Tests**

```tsx
// src/ui/app/AppShell.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'
import { useUiStore } from '@/state/uiStore'

const reset = () => {
  useUiStore.setState({ panels: { properties: true, minimap: false } })
}

describe('AppShell', () => {
  beforeEach(reset)

  it('renders all four slots', () => {
    render(<AppShell
      menuBar={<div data-testid="menu">Menu</div>}
      toolbar={<div data-testid="tb">Toolbar</div>}
      canvas={<div data-testid="canvas">Canvas</div>}
      properties={<div data-testid="props">Properties</div>}
    />)
    expect(screen.getByTestId('menu')).toBeInTheDocument()
    expect(screen.getByTestId('tb')).toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('props')).toBeInTheDocument()
  })

  it('hides properties pane when uiStore.panels.properties is false', () => {
    useUiStore.setState({ panels: { properties: false, minimap: false } })
    render(<AppShell
      menuBar={<div />} toolbar={<div />} canvas={<div />}
      properties={<div data-testid="props" />} />)
    expect(screen.queryByTestId('props')).not.toBeInTheDocument()
  })

  it('renders overlays slot above the main layout', () => {
    render(<AppShell
      menuBar={<div />} toolbar={<div />} canvas={<div />} properties={<div />}
      overlays={<div data-testid="overlay">Overlays</div>} />)
    expect(screen.getByTestId('overlay')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run + commit**

```
pnpm vitest run src/ui/app/AppShell.test.tsx
```

```bash
git add src/ui/app/
git commit -m "feat(ui): add AppShell three-pane responsive layout"
```

---

## Task 4: `ui/toolbar/` — `ToolButton`, `Toolbar`, drag-from-toolbar

**Files:**
- Create: `src/ui/toolbar/ToolButton.tsx` + `.test.tsx`
- Create: `src/ui/toolbar/Toolbar.tsx` + `.test.tsx`
- Create: `src/ui/toolbar/dragFromToolbar.ts` + `.test.ts`

Reads `chenPlugin.tools` to render groups. Dispatches `PICK_TOOL` via `useInteractionStore.getState().send(...)`. Active tool reads from the FSM context via a thin selector. Drag-from-toolbar uses native HTML5 `draggable` + `dataTransfer` to start a drag whose drop-on-canvas becomes a `PLACE_NODE` via two FSM events (`PICK_TOOL` + `CANVAS_POINTER_UP` at the drop coords).

### `ToolButton` contract

```ts
export interface ToolButtonProps {
  readonly toolId: string                // e.g. 'entity', 'select'
  readonly labelKey: string              // i18n key: 'toolbar.tool.entity'
  readonly icon: ReactNode
  readonly isActive: boolean
  readonly onPick: (toolId: string) => void
  readonly onDragStart?: (toolId: string, e: DragEvent<HTMLButtonElement>) => void
}
```

Pure. Keyboard activatable. `aria-pressed={isActive}`.

- [ ] **Step 1: `ToolButton.tsx`**

```tsx
// src/ui/toolbar/ToolButton.tsx
import type { DragEvent as ReactDragEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@/ui/primitives'

export interface ToolButtonProps {
  readonly toolId: string
  readonly labelKey: string
  readonly icon: ReactNode
  readonly isActive: boolean
  readonly onPick: (toolId: string) => void
  readonly onDragStart?: (toolId: string, e: ReactDragEvent<HTMLDivElement>) => void
}

export const ToolButton = ({ toolId, labelKey, icon, isActive, onPick, onDragStart }: ToolButtonProps) => {
  const { t } = useTranslation('toolbar')
  const label = t(labelKey)
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(toolId, e) : undefined}
      data-tool-id={toolId}
    >
      <IconButton
        aria-label={label}
        title={label}
        active={isActive}
        icon={icon}
        onClick={() => onPick(toolId)}
      />
    </div>
  )
}
```

- [ ] **Step 2: `ToolButton.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToolButton } from './ToolButton'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

describe('ToolButton', () => {
  it('renders with translated aria-label from labelKey', () => {
    render(<ToolButton toolId="entity" labelKey="tool.entity" icon={<span>E</span>} isActive={false} onPick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Entity' })).toBeInTheDocument()
  })

  it('fires onPick with the tool id when clicked', async () => {
    const onPick = vi.fn()
    render(<ToolButton toolId="entity" labelKey="tool.entity" icon={<span>E</span>} isActive={false} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onPick).toHaveBeenCalledWith('entity')
  })

  it('reflects isActive via aria-pressed', () => {
    render(<ToolButton toolId="entity" labelKey="tool.entity" icon={<span>E</span>} isActive onPick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('is draggable when onDragStart is provided', () => {
    const onDragStart = vi.fn()
    const { container } = render(
      <ToolButton toolId="entity" labelKey="tool.entity" icon={<span>E</span>} isActive={false} onPick={vi.fn()} onDragStart={onDragStart} />
    )
    expect(container.querySelector('[draggable="true"]')).toBeInTheDocument()
  })

  it('is not draggable when onDragStart is omitted', () => {
    const { container } = render(
      <ToolButton toolId="entity" labelKey="tool.entity" icon={<span>E</span>} isActive={false} onPick={vi.fn()} />
    )
    expect(container.querySelector('[draggable="true"]')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: `dragFromToolbar.ts` — pure helpers**

```ts
// src/ui/toolbar/dragFromToolbar.ts
import type { DragEvent } from 'react'

export const TOOL_MIME = 'application/x-er-tool'

export const writeToolToDataTransfer = (e: DragEvent<HTMLElement>, toolId: string): void => {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(TOOL_MIME, toolId)
}

export const readToolFromDataTransfer = (e: DragEvent<HTMLElement>): string | null => {
  const v = e.dataTransfer.getData(TOOL_MIME)
  return v || null
}
```

Tests cover round-trip: `write` then `read` yields the toolId; empty read returns null.

- [ ] **Step 4: `Toolbar.tsx`**

```tsx
// src/ui/toolbar/Toolbar.tsx
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolButton } from './ToolButton'
import { writeToolToDataTransfer } from './dragFromToolbar'
import { useInteractionStore } from '@/interaction/interactionStore'
import { chenPlugin } from '@/notation/chen'

// Tiny inline icon glyphs. When the product wants real icons, swap these out;
// the ToolButton contract is agnostic.
const ICONS: Record<string, string> = {
  select: '⬚', pan: '✋',
  entity: '▭', relationship: '◆', attribute: '◯', isa: '△',
  connect: '↔', quickRelationship: '▭◆▭', quickGeneralization: '△↓',
}

export const Toolbar = memo(() => {
  const { t } = useTranslation('toolbar')
  const currentTool = useInteractionStore((s) => s.snapshot.context.tool)

  const handlePick = (toolId: string): void => {
    useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: toolId as never })
  }

  const handleDragStart = (toolId: string, e: React.DragEvent<HTMLDivElement>): void => {
    writeToolToDataTransfer(e, toolId)
  }

  return (
    <nav aria-label={t('group.elements')} className="flex flex-col gap-1" data-role="toolbar">
      {chenPlugin.tools.groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1" data-role="toolbar-group" data-group-id={group.id}>
          {group.tools.map((toolId) => (
            <ToolButton
              key={toolId}
              toolId={toolId}
              labelKey={`tool.${toolId}`}
              icon={<span aria-hidden>{ICONS[toolId] ?? '?'}</span>}
              isActive={currentTool === toolId}
              onPick={handlePick}
              onDragStart={['entity', 'relationship', 'attribute', 'isa'].includes(toolId) ? handleDragStart : undefined}
            />
          ))}
        </div>
      ))}
    </nav>
  )
})
Toolbar.displayName = 'Toolbar'
```

- [ ] **Step 5: `Toolbar.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { useInteractionStore } from '@/interaction/interactionStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

describe('Toolbar', () => {
  beforeEach(reset)

  it('renders a button for each tool in chenPlugin.tools', () => {
    render(<Toolbar />)
    // Three groups × their tool counts = 9 total (select, pan, entity, relationship, attribute, isa, connect, quickRelationship, quickGeneralization).
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(9)
  })

  it('clicking "Entity" dispatches PICK_TOOL with tool=entity', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    const tool = useInteractionStore.getState().snapshot.context.tool
    expect(tool).toBe('entity')
  })

  it('active tool reflects FSM state via aria-pressed', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    expect(screen.getByRole('button', { name: 'Entity' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select' })).not.toHaveAttribute('aria-pressed', 'true')
  })

  it('element tools (entity/relationship/attribute/isa) are draggable', () => {
    const { container } = render(<Toolbar />)
    for (const tool of ['entity', 'relationship', 'attribute', 'isa']) {
      expect(container.querySelector(`[data-tool-id="${tool}"][draggable="true"]`)).toBeInTheDocument()
    }
  })

  it('non-element tools (select/pan/connect) are not draggable', () => {
    const { container } = render(<Toolbar />)
    for (const tool of ['select', 'pan', 'connect']) {
      expect(container.querySelector(`[data-tool-id="${tool}"][draggable="true"]`)).not.toBeInTheDocument()
    }
  })
})
```

- [ ] **Step 6: Run + commit**

```
pnpm vitest run src/ui/toolbar/
```

```bash
git add src/ui/toolbar/
git commit -m "feat(ui): add Toolbar driven by chenPlugin.tools, drag-from-toolbar supported"
```

---

## Task 5: `ui/overlays/ToastStack.tsx`

**Files:**
- Create: `src/ui/overlays/ToastStack.tsx`
- Create: `src/ui/overlays/ToastStack.test.tsx`

Subscribes to `uiStore.toasts` and renders each as a dismissible card in a fixed-position stack (bottom-right by default). Auto-dismiss after 4000 ms per toast unless `kind === 'error'` (errors are manual-dismiss).

- [ ] **Step 1: Implementation**

```tsx
// src/ui/overlays/ToastStack.tsx
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/state/uiStore'
import { IconButton } from '@/ui/primitives'

const AUTO_DISMISS_MS: Record<string, number> = { info: 4000, success: 4000, warning: 6000 }
// 'error' → no auto-dismiss.

const KIND_CLASS: Record<string, string> = {
  info: 'bg-blue-50 text-blue-900 border-blue-200',
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  error: 'bg-red-50 text-red-900 border-red-200',
}

export const ToastStack = () => {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  const { t } = useTranslation()

  useEffect(() => {
    const timers = toasts
      .filter((x) => x.kind !== 'error')
      .map((x) => window.setTimeout(() => dismiss(x.id), AUTO_DISMISS_MS[x.kind] ?? 4000))
    return () => { timers.forEach(clearTimeout) }
  }, [toasts, dismiss])

  if (toasts.length === 0) return null
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region" aria-label="Notifications" data-role="toast-stack"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          data-role="toast" data-kind={toast.kind}
          className={`pointer-events-auto flex min-w-[240px] items-start gap-2 rounded border px-3 py-2 text-sm shadow ${KIND_CLASS[toast.kind]}`}
        >
          <span className="flex-1">{t(toast.messageKey, toast.messageParams)}</span>
          <IconButton
            aria-label="Dismiss notification"
            size="sm"
            onClick={() => dismiss(toast.id)}
            icon={<span aria-hidden>×</span>}
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Tests**

```tsx
// src/ui/overlays/ToastStack.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastStack } from './ToastStack'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useUiStore.setState({ toasts: [] })
}

describe('ToastStack', () => {
  beforeEach(reset)

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastStack />)
    expect(container.querySelector('[data-role="toast-stack"]')).not.toBeInTheDocument()
  })

  it('renders one toast per entry in uiStore.toasts', () => {
    useUiStore.setState({ toasts: [
      { id: '1', kind: 'success', messageKey: 'common:save' },
      { id: '2', kind: 'error', messageKey: 'common:close' },
    ]})
    render(<ToastStack />)
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  it('dismiss button removes a toast from the store', async () => {
    useUiStore.setState({ toasts: [{ id: '1', kind: 'error', messageKey: 'common:save' }] })
    render(<ToastStack />)
    await userEvent.click(screen.getByLabelText('Dismiss notification'))
    expect(useUiStore.getState().toasts).toEqual([])
  })

  it('auto-dismisses non-error toasts after their timeout', () => {
    vi.useFakeTimers()
    useUiStore.setState({ toasts: [{ id: '1', kind: 'success', messageKey: 'common:save' }] })
    render(<ToastStack />)
    expect(useUiStore.getState().toasts).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(4001) })
    expect(useUiStore.getState().toasts).toEqual([])
    vi.useRealTimers()
  })

  it('does not auto-dismiss error toasts', () => {
    vi.useFakeTimers()
    useUiStore.setState({ toasts: [{ id: '1', kind: 'error', messageKey: 'common:save' }] })
    render(<ToastStack />)
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(useUiStore.getState().toasts).toHaveLength(1)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/overlays/ToastStack.tsx src/ui/overlays/ToastStack.test.tsx
git commit -m "feat(ui): add ToastStack overlay with auto-dismiss + manual-only errors"
```

---

## Task 6: `ui/overlays/` — `ModalStack`, `ConfirmModal`, `ErrorModal`

**Files:**
- Create: `src/ui/overlays/ModalStack.tsx` + `.test.tsx`
- Create: `src/ui/overlays/ConfirmModal.tsx` + `.test.tsx`
- Create: `src/ui/overlays/ErrorModal.tsx` + `.test.tsx`

`ModalStack` subscribes to `uiStore.modals` and dispatches to a registry of modal components keyed by `modal.kind`. `ConfirmModal` and `ErrorModal` are two of the built-in kinds; `CheatsheetModal` (Task 7) is a third.

- [ ] **Step 1: `ConfirmModal.tsx`**

```tsx
// src/ui/overlays/ConfirmModal.tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/ui/primitives'
import { useUiStore } from '@/state/uiStore'

export interface ConfirmModalProps {
  readonly modalId: string
  readonly titleKey: string
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
  readonly danger?: boolean
  // The store-level modal pushes `onConfirm` / `onCancel` callback keys. For Phase 6,
  // consumers call `pushModal` with a pair of callback fields; we invoke them on resolve.
  readonly onConfirm: () => void
  readonly onCancel?: () => void
}

export const ConfirmModal = ({
  modalId, titleKey, messageKey, messageParams, danger, onConfirm, onCancel,
}: ConfirmModalProps) => {
  const { t } = useTranslation()
  const pop = useUiStore((s) => s.popModal)

  const handleCancel = () => { onCancel?.(); pop() }
  const handleConfirm = () => { onConfirm(); pop() }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" role="dialog" aria-modal data-modal-id={modalId} data-kind="confirm">
      <div className="w-[min(420px,90vw)] rounded bg-white p-4 shadow-lg">
        <h2 className="mb-2 text-base font-semibold">{t(titleKey)}</h2>
        <p className="mb-4 text-sm text-slate-700">{t(messageKey, messageParams)}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel}>{t('cancel', { ns: 'common' })}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm}>{t('confirm', { ns: 'common' })}</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `ErrorModal.tsx`**

```tsx
// src/ui/overlays/ErrorModal.tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/ui/primitives'
import { useUiStore } from '@/state/uiStore'

export interface ErrorModalProps {
  readonly modalId: string
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
  readonly detail?: string
}

export const ErrorModal = ({ modalId, messageKey, messageParams, detail }: ErrorModalProps) => {
  const { t } = useTranslation()
  const pop = useUiStore((s) => s.popModal)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" role="alertdialog" aria-modal data-modal-id={modalId} data-kind="error">
      <div className="w-[min(480px,90vw)] rounded bg-white p-4 shadow-lg">
        <h2 className="mb-2 text-base font-semibold text-red-700">{t('error.title', { ns: 'modals' })}</h2>
        <p className="mb-2 text-sm text-slate-800">{t(messageKey, messageParams)}</p>
        {detail && <pre className="mb-3 max-h-40 overflow-auto rounded bg-slate-100 p-2 text-xs text-slate-600">{detail}</pre>}
        <div className="flex justify-end">
          <Button variant="primary" onClick={pop}>{t('error.dismiss', { ns: 'modals' })}</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `ModalStack.tsx`**

```tsx
// src/ui/overlays/ModalStack.tsx
import type { ReactNode } from 'react'
import { useUiStore, type Modal } from '@/state/uiStore'
import { ConfirmModal, type ConfirmModalProps } from './ConfirmModal'
import { ErrorModal, type ErrorModalProps } from './ErrorModal'

// Map a modal descriptor to its React element. Extend here for additional
// built-in kinds (e.g. CheatsheetModal in Task 7).
const renderModal = (m: Modal): ReactNode => {
  const common = { modalId: m.id }
  switch (m.kind) {
    case 'confirm':
      return <ConfirmModal key={m.id} {...(m.props as unknown as ConfirmModalProps)} {...common} />
    case 'error':
      return <ErrorModal key={m.id} {...(m.props as unknown as ErrorModalProps)} {...common} />
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
```

Only the top-most modal is rendered (LIFO). Nested confirm-over-error is uncommon; keep the stack simple.

- [ ] **Step 4: Tests for ConfirmModal**

```tsx
// src/ui/overlays/ConfirmModal.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from './ConfirmModal'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('ConfirmModal', () => {
  beforeEach(reset)

  it('renders title + message from i18n keys', () => {
    render(<ConfirmModal modalId="x" titleKey="confirm.title" messageKey="confirm.title" onConfirm={vi.fn()} />)
    expect(screen.getAllByText('Please confirm')).not.toHaveLength(0)
  })

  it('confirm button calls onConfirm and pops the modal', async () => {
    const onConfirm = vi.fn()
    useUiStore.setState({ modals: [{ id: 'x', kind: 'confirm', props: {} }] })
    render(<ConfirmModal modalId="x" titleKey="confirm.title" messageKey="confirm.title" onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().modals).toEqual([])
  })

  it('cancel button calls onCancel and pops the modal', async () => {
    const onCancel = vi.fn()
    useUiStore.setState({ modals: [{ id: 'x', kind: 'confirm', props: {} }] })
    render(<ConfirmModal modalId="x" titleKey="confirm.title" messageKey="confirm.title" onConfirm={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().modals).toEqual([])
  })

  it('danger variant uses the danger button class', () => {
    render(<ConfirmModal modalId="x" titleKey="confirm.title" messageKey="confirm.title" danger onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Confirm' }).className).toContain('bg-red-600')
  })
})
```

- [ ] **Step 5: Tests for ErrorModal**

```tsx
// src/ui/overlays/ErrorModal.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorModal } from './ErrorModal'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('ErrorModal', () => {
  beforeEach(reset)

  it('renders with role alertdialog', () => {
    render(<ErrorModal modalId="x" messageKey="common:save" />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('optional detail is rendered inside <pre>', () => {
    const { container } = render(<ErrorModal modalId="x" messageKey="common:save" detail="stack trace here" />)
    expect(container.querySelector('pre')).toHaveTextContent('stack trace here')
  })

  it('dismiss button pops the modal', async () => {
    useUiStore.setState({ modals: [{ id: 'x', kind: 'error', props: {} }] })
    render(<ErrorModal modalId="x" messageKey="common:save" />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(useUiStore.getState().modals).toEqual([])
  })
})
```

- [ ] **Step 6: Tests for ModalStack**

```tsx
// src/ui/overlays/ModalStack.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModalStack } from './ModalStack'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('ModalStack', () => {
  beforeEach(reset)

  it('renders nothing when no modals are pushed', () => {
    const { container } = render(<ModalStack />)
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('renders a ConfirmModal when topmost modal is kind=confirm', () => {
    useUiStore.setState({ modals: [
      { id: 'm1', kind: 'confirm', props: {
        titleKey: 'confirm.title', messageKey: 'confirm.title',
        onConfirm: () => {},
      }},
    ]})
    render(<ModalStack />)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-kind', 'confirm')
  })

  it('renders ErrorModal when topmost is kind=error', () => {
    useUiStore.setState({ modals: [
      { id: 'm1', kind: 'error', props: { messageKey: 'common:save' } },
    ]})
    render(<ModalStack />)
    expect(screen.getByRole('alertdialog')).toHaveAttribute('data-kind', 'error')
  })

  it('shows only the topmost modal when stacked', () => {
    useUiStore.setState({ modals: [
      { id: 'a', kind: 'confirm', props: { titleKey: 'confirm.title', messageKey: 'confirm.title', onConfirm: () => {} } },
      { id: 'b', kind: 'error', props: { messageKey: 'common:save' } },
    ]})
    render(<ModalStack />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run + commit**

```
pnpm vitest run src/ui/overlays/
```

```bash
git add src/ui/overlays/{ConfirmModal,ErrorModal,ModalStack}.tsx src/ui/overlays/{ConfirmModal,ErrorModal,ModalStack}.test.tsx
git commit -m "feat(ui): add ModalStack + ConfirmModal + ErrorModal overlays"
```

---

## Task 7: `ui/overlays/CheatsheetModal.tsx`

**Files:**
- Create: `src/ui/overlays/CheatsheetModal.tsx`
- Create: `src/ui/overlays/CheatsheetModal.test.tsx`
- Modify: `src/ui/overlays/ModalStack.tsx` (add `cheatsheet` branch to the switch)

Reads the full `keybindings` registry from `@/interaction/keybindings`, groups bindings by `category`, renders a table. Dismiss-only (no confirm/cancel).

- [ ] **Step 1: Implementation**

```tsx
// src/ui/overlays/CheatsheetModal.tsx
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { keybindings, type Keybinding } from '@/interaction/keybindings'
import { Button, KeyboardShortcut } from '@/ui/primitives'
import { useUiStore } from '@/state/uiStore'

const CATEGORIES: readonly Keybinding['category'][] = ['tool', 'operation', 'contextual', 'navigation']

export interface CheatsheetModalProps {
  readonly modalId: string
}

export const CheatsheetModal = ({ modalId }: CheatsheetModalProps) => {
  const { t } = useTranslation('modals')
  const pop = useUiStore((s) => s.popModal)
  const byCategory = useMemo(() => {
    const out: Record<Keybinding['category'], Keybinding[]> = {
      tool: [], operation: [], contextual: [], navigation: [],
    }
    for (const kb of keybindings) out[kb.category].push(kb)
    return out
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" role="dialog" aria-modal data-modal-id={modalId} data-kind="cheatsheet">
      <div className="flex max-h-[80vh] w-[min(640px,90vw)] flex-col rounded bg-white p-4 shadow-lg">
        <h2 className="mb-3 text-base font-semibold">{t('cheatsheet.title')}</h2>
        <div className="flex-1 overflow-auto">
          {CATEGORIES.map((cat) => byCategory[cat].length > 0 && (
            <section key={cat} className="mb-4">
              <h3 className="mb-1 text-sm font-semibold text-slate-700">{t(`cheatsheet.category.${cat}`)}</h3>
              <ul className="flex flex-col gap-1">
                {byCategory[cat].map((kb) => (
                  <li key={kb.id} className="flex items-center justify-between text-xs text-slate-700">
                    <span>{t(kb.descriptionKey)}</span>
                    <span className="flex gap-1">
                      {kb.keys.map((k) => <KeyboardShortcut key={k} combo={k} />)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" onClick={pop}>{t('close', { ns: 'common' })}</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify `ModalStack.tsx`**

Add to the switch:
```ts
case 'cheatsheet':
  return <CheatsheetModal key={m.id} {...common} />
```
And add the import at the top.

- [ ] **Step 3: Extend EN `modals.json` with keybinding `descriptionKey`s**

The keybindings registry uses `descriptionKey` strings (e.g. `'shortcut.undo'`). Add them under a new `shortcut` namespace. Inspect `src/interaction/keybindings.ts` for the 28-30 exact keys, then extend `src/platform/i18n/locales/en/modals.json`:

```json
{
  "cheatsheet": { /* unchanged */ },
  "confirm": { /* unchanged */ },
  "error": { /* unchanged */ },
  "shortcut": {
    "undo": "Undo",
    "redo": "Redo",
    "selectAll": "Select all",
    "delete": "Delete selection",
    "escape": "Clear selection / cancel",
    "rename": "Rename",
    "duplicate": "Duplicate",
    "cut": "Cut",
    "copy": "Copy",
    "paste": "Paste",
    "cycleForward": "Cycle selection forward",
    "cycleBackward": "Cycle selection backward",
    "invertSelection": "Invert selection",
    "nudgeUp": "Nudge up",
    "nudgeDown": "Nudge down",
    "nudgeLeft": "Nudge left",
    "nudgeRight": "Nudge right",
    "zoomIn": "Zoom in",
    "zoomOut": "Zoom out",
    "fit": "Fit to view",
    "toolSelect": "Select tool",
    "toolPan": "Pan tool",
    "toolEntity": "Entity tool",
    "toolRelationship": "Relationship tool",
    "toolAttribute": "Attribute tool",
    "toolIsa": "Generalization tool",
    "toolConnect": "Connect tool",
    "toggleCheatsheet": "Show keyboard shortcuts"
  }
}
```

> **Verify first:** `grep -n "descriptionKey:" src/interaction/keybindings.ts` to confirm every key, then update `modals.json` to match exactly. Copy the same shape into `it/modals.json` (same values — Phase 7 translates).

- [ ] **Step 4: Tests**

```tsx
// src/ui/overlays/CheatsheetModal.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheatsheetModal } from './CheatsheetModal'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('CheatsheetModal', () => {
  beforeEach(reset)

  it('has role=dialog with data-kind="cheatsheet"', () => {
    render(<CheatsheetModal modalId="x" />)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-kind', 'cheatsheet')
  })

  it('renders a category heading for each non-empty group', () => {
    render(<CheatsheetModal modalId="x" />)
    // At least "Tools" and "Operations" must be present given registry contents.
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })

  it('renders a <kbd> element per binding key', () => {
    const { container } = render(<CheatsheetModal modalId="x" />)
    const kbds = container.querySelectorAll('kbd')
    // Registry has ~30 bindings; many use multi-key cross-platform aliases. >=20 is a conservative lower bound.
    expect(kbds.length).toBeGreaterThan(20)
  })

  it('close button pops the modal', async () => {
    useUiStore.setState({ modals: [{ id: 'x', kind: 'cheatsheet', props: {} }] })
    render(<CheatsheetModal modalId="x" />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(useUiStore.getState().modals).toEqual([])
  })
})
```

- [ ] **Step 5: Run + commit**

```
pnpm vitest run src/ui/overlays/CheatsheetModal.test.tsx src/ui/overlays/ModalStack.test.tsx
```

```bash
git add src/ui/overlays/CheatsheetModal.tsx src/ui/overlays/CheatsheetModal.test.tsx src/ui/overlays/ModalStack.tsx src/platform/i18n/locales/en/modals.json src/platform/i18n/locales/it/modals.json
git commit -m "feat(ui): add CheatsheetModal generated from keybindings registry"
```

---

## Task 8: `ui/overlays/ContextMenu.tsx`

**Files:**
- Create: `src/ui/overlays/ContextMenu.tsx`
- Create: `src/ui/overlays/ContextMenu.test.tsx`

A generic context menu overlay shown at the cursor position. Driven by `uiStore.contextMenu` — adds a new slice.

Why not reuse `uiStore.modals`? The modal layer is centred / full-screen. Context menus are cursor-anchored + outside-click-to-dismiss. Different semantics → different slice.

### Extend `uiStore` with a context-menu slice

Add:
```ts
export interface ContextMenuItem {
  readonly id: string
  readonly labelKey: string
  readonly shortcut?: string          // for display
  readonly danger?: boolean
  readonly disabled?: boolean
  readonly onSelect: () => void
}
export interface ContextMenuState {
  readonly at: { readonly x: number; readonly y: number }
  readonly items: readonly ContextMenuItem[]
}

// UiStoreState additions:
readonly contextMenu: ContextMenuState | null
openContextMenu: (state: ContextMenuState) => void
closeContextMenu: () => void

// Actions impl:
openContextMenu: (state) => set((s) => { s.contextMenu = state }),
closeContextMenu: () => set((s) => { s.contextMenu = null }),

// Initial state:
contextMenu: null,
```

NOT persisted (no entry in `partialize`).

- [ ] **Step 1: Extend `uiStore` with the new slice (+ tests)**

Add 2 uiStore tests:
```ts
it('openContextMenu sets the contextMenu state', () => {
  useUiStore.getState().openContextMenu({
    at: { x: 10, y: 20 },
    items: [{ id: 'a', labelKey: 'common:ok', onSelect: () => {} }],
  })
  expect(useUiStore.getState().contextMenu?.at).toEqual({ x: 10, y: 20 })
})

it('closeContextMenu clears the state', () => {
  useUiStore.getState().openContextMenu({ at: { x: 0, y: 0 }, items: [] })
  useUiStore.getState().closeContextMenu()
  expect(useUiStore.getState().contextMenu).toBeNull()
})
```

Run `pnpm vitest run src/state/uiStore.test.ts` — should pass.

- [ ] **Step 2: Implement `ContextMenu.tsx`**

```tsx
// src/ui/overlays/ContextMenu.tsx
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/state/uiStore'
import { KeyboardShortcut } from '@/ui/primitives'

export const ContextMenu = () => {
  const cm = useUiStore((s) => s.contextMenu)
  const close = useUiStore((s) => s.closeContextMenu)
  const { t } = useTranslation()

  useEffect(() => {
    if (!cm) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onScroll = () => close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [cm, close])

  if (!cm) return null
  const { at, items } = cm
  return (
    <>
      {/* Outside-click catcher */}
      <div className="fixed inset-0 z-40" onClick={close} onContextMenu={(e) => { e.preventDefault(); close() }} />
      <ul
        role="menu"
        data-role="context-menu"
        className="fixed z-50 min-w-[200px] rounded border border-slate-200 bg-white py-1 shadow-lg"
        style={{ left: at.x, top: at.y }}
      >
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { it.onSelect(); close() }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                it.danger ? 'text-red-700' : 'text-slate-800'
              }`}
            >
              <span>{t(it.labelKey)}</span>
              {it.shortcut && <KeyboardShortcut combo={it.shortcut} />}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
```

- [ ] **Step 3: Tests**

```tsx
// src/ui/overlays/ContextMenu.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextMenu } from './ContextMenu'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.getState().closeContextMenu() }

describe('ContextMenu', () => {
  beforeEach(reset)

  it('renders nothing when contextMenu is null', () => {
    const { container } = render(<ContextMenu />)
    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument()
  })

  it('renders one <menuitem> per item at the given position', () => {
    useUiStore.getState().openContextMenu({
      at: { x: 120, y: 240 },
      items: [
        { id: 'a', labelKey: 'common:save', onSelect: vi.fn() },
        { id: 'b', labelKey: 'common:delete', onSelect: vi.fn() },
      ],
    })
    render(<ContextMenu />)
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
  })

  it('positions the menu at (x, y) via inline style', () => {
    useUiStore.getState().openContextMenu({ at: { x: 11, y: 22 }, items: [] })
    const { container } = render(<ContextMenu />)
    const menu = container.querySelector('[role="menu"]') as HTMLElement
    expect(menu.style.left).toBe('11px')
    expect(menu.style.top).toBe('22px')
  })

  it('clicking an item calls onSelect and closes', async () => {
    const onSelect = vi.fn()
    useUiStore.getState().openContextMenu({
      at: { x: 0, y: 0 },
      items: [{ id: 'x', labelKey: 'common:save', onSelect }],
    })
    render(<ContextMenu />)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().contextMenu).toBeNull()
  })

  it('Escape key closes the menu', async () => {
    useUiStore.getState().openContextMenu({ at: { x: 0, y: 0 }, items: [{ id: 'x', labelKey: 'common:save', onSelect: vi.fn() }] })
    render(<ContextMenu />)
    await userEvent.keyboard('{Escape}')
    expect(useUiStore.getState().contextMenu).toBeNull()
  })

  it('disabled item does not fire onSelect', async () => {
    const onSelect = vi.fn()
    useUiStore.getState().openContextMenu({ at: { x: 0, y: 0 }, items: [{ id: 'x', labelKey: 'common:save', disabled: true, onSelect }] })
    render(<ContextMenu />)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save' }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add src/state/uiStore.ts src/state/uiStore.test.ts src/ui/overlays/ContextMenu.tsx src/ui/overlays/ContextMenu.test.tsx
git commit -m "feat(ui,state): add ContextMenu overlay + uiStore.contextMenu slice"
```

---

## Task 9: `ui/properties/` — panel shell + empty/multi states

**Files:**
- Create: `src/ui/properties/PropertyPanel.tsx` + `.test.tsx`
- Create: `src/ui/properties/EmptyPanel.tsx` + `.test.tsx`
- Create: `src/ui/properties/MultiSelectSummary.tsx` + `.test.tsx`

Subscribes to `selectionStore`. When nothing is selected → `EmptyPanel`. When one node or edge → delegate to a kind-specific editor (Tasks 10-12). When multiple → `MultiSelectSummary`.

- [ ] **Step 1: `EmptyPanel.tsx`**

```tsx
// src/ui/properties/EmptyPanel.tsx
import { useTranslation } from 'react-i18next'

export const EmptyPanel = () => {
  const { t } = useTranslation('properties')
  return (
    <div className="flex h-full items-center justify-center p-4 text-xs text-slate-500" data-role="empty-panel">
      {t('empty')}
    </div>
  )
}
```

- [ ] **Step 2: `MultiSelectSummary.tsx`**

```tsx
// src/ui/properties/MultiSelectSummary.tsx
import { useTranslation } from 'react-i18next'

export interface MultiSelectSummaryProps { readonly count: number }

export const MultiSelectSummary = ({ count }: MultiSelectSummaryProps) => {
  const { t } = useTranslation('properties')
  return (
    <div className="p-3 text-sm text-slate-700" data-role="multi-select-summary">
      {t('multi', { count })}
    </div>
  )
}
```

- [ ] **Step 3: `PropertyPanel.tsx`**

```tsx
// src/ui/properties/PropertyPanel.tsx
import { lazy, Suspense } from 'react'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import type { ERNode, ERLink } from '@/domain/types'
import { EmptyPanel } from './EmptyPanel'
import { MultiSelectSummary } from './MultiSelectSummary'

// Kind-specific editors are imported eagerly — the panel is always mounted in
// desktop layouts, so lazy-loading gains nothing but adds a Suspense path.
import { EntityProperties } from './EntityProperties'
import { RelationshipProperties } from './RelationshipProperties'
import { AttributeProperties } from './AttributeProperties'
import { ISAProperties } from './ISAProperties'
import { EdgeProperties } from './EdgeProperties'

const renderForNode = (node: ERNode) => {
  switch (node.kind) {
    case 'entity': return <EntityProperties node={node} />
    case 'relationship': return <RelationshipProperties node={node} />
    case 'attribute': return <AttributeProperties node={node} />
    case 'isa': return <ISAProperties node={node} />
  }
}

export const PropertyPanel = () => {
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useSelectionStore((s) => s.selectedEdgeIds)
  const diagram = useDiagramStore((s) => s.diagram)

  const totalSelected = selectedNodeIds.size + selectedEdgeIds.size
  if (totalSelected === 0) return <EmptyPanel />
  if (totalSelected > 1) return <MultiSelectSummary count={totalSelected} />

  if (selectedNodeIds.size === 1) {
    const id = [...selectedNodeIds][0]
    const node = diagram.nodesById[id]
    if (!node) return <EmptyPanel />
    return <div data-role="property-panel" data-node-kind={node.kind}>{renderForNode(node)}</div>
  }
  const id = [...selectedEdgeIds][0]
  const edge = diagram.edgesById[id] as ERLink | undefined
  if (!edge) return <EmptyPanel />
  return <div data-role="property-panel" data-edge-kind={edge.kind}><EdgeProperties edge={edge} /></div>
}
```

Note: `Suspense` / `lazy` imports removed from the final code; the eager imports line above replaces them. Delete the first two lines of the import block.

```ts
// Corrected imports at the top:
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import type { ERNode, ERLink } from '@/domain/types'
import { EmptyPanel } from './EmptyPanel'
import { MultiSelectSummary } from './MultiSelectSummary'
import { EntityProperties } from './EntityProperties'
import { RelationshipProperties } from './RelationshipProperties'
import { AttributeProperties } from './AttributeProperties'
import { ISAProperties } from './ISAProperties'
import { EdgeProperties } from './EdgeProperties'
```

**Sequencing:** PropertyPanel imports the kind-specific editors, which are built in Tasks 10-12. This task creates `EmptyPanel`, `MultiSelectSummary`, and the panel scaffold — but leaves the kind-specific imports commented out + placeholder renderers until Task 12 lands. **Alternative:** write `PropertyPanel.tsx` with placeholder inline stubs (`<div>Entity props</div>`) in this task and replace them in Tasks 10-12.

Simpler fix: **land PropertyPanel with placeholder inline stubs in this task**, so each subsequent task (10, 11, 12) just swaps one placeholder for the real editor. Tests for the panel shell use `selectedNodeIds.size === 0/1/>1` branches only — the placeholder stubs don't matter.

- [ ] **Step 4: Simplified PropertyPanel for Task 9**

```tsx
// src/ui/properties/PropertyPanel.tsx  (Task 9 form)
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { EmptyPanel } from './EmptyPanel'
import { MultiSelectSummary } from './MultiSelectSummary'

// Per-kind editors land in Tasks 10-12. For now, render a placeholder <div>
// so the shell's selection-count branching is testable.
const Placeholder = ({ label }: { label: string }) => (
  <div className="p-3 text-xs text-slate-500" data-role="placeholder">{label}</div>
)

export const PropertyPanel = () => {
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useSelectionStore((s) => s.selectedEdgeIds)
  const diagram = useDiagramStore((s) => s.diagram)

  const total = selectedNodeIds.size + selectedEdgeIds.size
  if (total === 0) return <EmptyPanel />
  if (total > 1) return <MultiSelectSummary count={total} />

  if (selectedNodeIds.size === 1) {
    const id = [...selectedNodeIds][0]
    const node = diagram.nodesById[id]
    if (!node) return <EmptyPanel />
    return <div data-role="property-panel" data-node-kind={node.kind}><Placeholder label={`${node.kind} editor (Task 10-12)`} /></div>
  }

  const id = [...selectedEdgeIds][0]
  const edge = diagram.edgesById[id]
  if (!edge) return <EmptyPanel />
  return <div data-role="property-panel" data-edge-kind={edge.kind}><Placeholder label={`${edge.kind} editor (Task 12)`} /></div>
}
```

- [ ] **Step 5: Tests for `EmptyPanel` / `MultiSelectSummary` / `PropertyPanel`**

```tsx
// src/ui/properties/EmptyPanel.test.tsx
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyPanel } from './EmptyPanel'
import { initI18n } from '@/platform/i18n'
beforeAll(async () => { await initI18n() })
describe('EmptyPanel', () => {
  it('renders the "select a node or edge" text', () => {
    render(<EmptyPanel />)
    expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument()
  })
})
```

```tsx
// src/ui/properties/MultiSelectSummary.test.tsx
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MultiSelectSummary } from './MultiSelectSummary'
import { initI18n } from '@/platform/i18n'
beforeAll(async () => { await initI18n() })
describe('MultiSelectSummary', () => {
  it('shows "{count} items selected"', () => {
    render(<MultiSelectSummary count={3} />)
    expect(screen.getByText('3 items selected')).toBeInTheDocument()
  })
})
```

```tsx
// src/ui/properties/PropertyPanel.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertyPanel } from './PropertyPanel'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { emptyDiagram, type NodeId, type EdgeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
}

describe('PropertyPanel', () => {
  beforeEach(reset)

  it('empty selection → EmptyPanel', () => {
    render(<PropertyPanel />)
    expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument()
  })

  it('multi selection → MultiSelectSummary with count', () => {
    useSelectionStore.setState({
      selectedNodeIds: new Set<NodeId>(['a' as NodeId, 'b' as NodeId]),
      selectedEdgeIds: new Set(),
      rubberband: null,
    })
    render(<PropertyPanel />)
    expect(screen.getByText('2 items selected')).toBeInTheDocument()
  })

  it('single node selection → panel carries data-node-kind', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({ selectedNodeIds: new Set([id]), selectedEdgeIds: new Set(), rubberband: null })
    const { container } = render(<PropertyPanel />)
    expect(container.querySelector('[data-role="property-panel"]')).toHaveAttribute('data-node-kind', 'entity')
  })

  it('single edge selection → panel carries data-edge-kind', () => {
    const s = useDiagramStore.getState().addNode({ kind: 'entity', name: 'A', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    const t = useDiagramStore.getState().addNode({ kind: 'relationship', name: 'r', isIdentifying: false, position: { x: 200, y: 0 }, size: { width: 140, height: 70 } })
    const eid = useDiagramStore.getState().addEdge({ kind: 'entity-relationship', sourceId: s, targetId: t, cardinality: '1', participation: 'total', waypoints: [] })
    useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set<EdgeId>([eid]), rubberband: null })
    const { container } = render(<PropertyPanel />)
    expect(container.querySelector('[data-role="property-panel"]')).toHaveAttribute('data-edge-kind', 'entity-relationship')
  })

  it('stale selection (id not in store) → EmptyPanel', () => {
    useSelectionStore.setState({ selectedNodeIds: new Set<NodeId>(['ghost' as NodeId]), selectedEdgeIds: new Set(), rubberband: null })
    render(<PropertyPanel />)
    expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/properties/{EmptyPanel,MultiSelectSummary,PropertyPanel}.tsx src/ui/properties/{EmptyPanel,MultiSelectSummary,PropertyPanel}.test.tsx
git commit -m "feat(ui): add PropertyPanel shell with empty + multi-select states"
```

---

## Task 10: `EntityProperties` + `RelationshipProperties`

**Files:**
- Create: `src/ui/properties/EntityProperties.tsx` + `.test.tsx`
- Create: `src/ui/properties/RelationshipProperties.tsx` + `.test.tsx`
- Modify: `src/ui/properties/PropertyPanel.tsx` (replace entity/relationship placeholders with real editors)

Both editors take a node prop, render name + boolean flag(s), and write back via `diagramStore.updateNode`.

- [ ] **Step 1: `EntityProperties.tsx`**

```tsx
// src/ui/properties/EntityProperties.tsx
import { useTranslation } from 'react-i18next'
import type { EntityNode } from '@/domain/types'
import { TextInput, Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface EntityPropertiesProps { readonly node: EntityNode }

export const EntityProperties = ({ node }: EntityPropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="entity-properties">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('kind.entity')}</h3>
      <TextInput
        label={t('name')}
        value={node.name}
        onChange={(e) => update(node.id, { name: e.target.value } as Partial<EntityNode>)}
      />
      <Checkbox
        label={t('isWeak')}
        checked={node.isWeak}
        onChange={(e) => update(node.id, { isWeak: e.target.checked } as Partial<EntityNode>)}
      />
    </div>
  )
}
```

- [ ] **Step 2: `RelationshipProperties.tsx`**

```tsx
// src/ui/properties/RelationshipProperties.tsx
import { useTranslation } from 'react-i18next'
import type { RelationshipNode } from '@/domain/types'
import { TextInput, Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface RelationshipPropertiesProps { readonly node: RelationshipNode }

export const RelationshipProperties = ({ node }: RelationshipPropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="relationship-properties">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('kind.relationship')}</h3>
      <TextInput
        label={t('name')}
        value={node.name}
        onChange={(e) => update(node.id, { name: e.target.value } as Partial<RelationshipNode>)}
      />
      <Checkbox
        label={t('isIdentifying')}
        checked={node.isIdentifying}
        onChange={(e) => update(node.id, { isIdentifying: e.target.checked } as Partial<RelationshipNode>)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Update `PropertyPanel.tsx` — replace entity/relationship placeholders**

Replace the placeholder branch in `PropertyPanel.tsx`:
```tsx
// Before: <Placeholder label={`${node.kind} editor …`} />
// After:
if (node.kind === 'entity') return <div data-role="property-panel" data-node-kind="entity"><EntityProperties node={node} /></div>
if (node.kind === 'relationship') return <div data-role="property-panel" data-node-kind="relationship"><RelationshipProperties node={node} /></div>
// Keep the Placeholder fallback for attribute + isa (Tasks 11 & 12).
```

Cleaner: switch over `node.kind`, render `Placeholder` for the two kinds not yet implemented.

- [ ] **Step 4: Tests**

```tsx
// src/ui/properties/EntityProperties.test.tsx
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntityProperties } from './EntityProperties'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type EntityNode } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const mkEntity = (): EntityNode => {
  const id = useDiagramStore.getState().addNode({
    kind: 'entity', name: 'Customer', isWeak: false,
    position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  })
  return useDiagramStore.getState().diagram.nodesById[id] as EntityNode
}

describe('EntityProperties', () => {
  beforeEach(reset)

  it('renders current name and isWeak state', () => {
    const node = mkEntity()
    render(<EntityProperties node={node} />)
    expect(screen.getByDisplayValue('Customer')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Weak entity' })).not.toBeChecked()
  })

  it('changing name writes to diagramStore', async () => {
    const node = mkEntity()
    render(<EntityProperties node={node} />)
    const input = screen.getByDisplayValue('Customer')
    await userEvent.clear(input)
    await userEvent.type(input, 'User')
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as EntityNode
    expect(after.name).toBe('User')
  })

  it('toggling isWeak writes to diagramStore', async () => {
    const node = mkEntity()
    render(<EntityProperties node={node} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Weak entity' }))
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as EntityNode
    expect(after.isWeak).toBe(true)
  })
})
```

Similar for `RelationshipProperties.test.tsx` — mount, verify `name` + `isIdentifying` controls, then mutate and assert store reflects.

- [ ] **Step 5: Commit**

```bash
git add src/ui/properties/{EntityProperties,RelationshipProperties}.tsx src/ui/properties/{EntityProperties,RelationshipProperties}.test.tsx src/ui/properties/PropertyPanel.tsx
git commit -m "feat(ui): add EntityProperties + RelationshipProperties editors"
```

---

## Task 11: `AttributeProperties` + `ISAProperties`

**Files:**
- Create: `src/ui/properties/AttributeProperties.tsx` + `.test.tsx`
- Create: `src/ui/properties/ISAProperties.tsx` + `.test.tsx`
- Modify: `src/ui/properties/PropertyPanel.tsx` (wire in the two new editors)

### Attribute editor — five boolean toggles + name

- [ ] **Step 1: `AttributeProperties.tsx`**

```tsx
// src/ui/properties/AttributeProperties.tsx
import { useTranslation } from 'react-i18next'
import type { AttributeNode } from '@/domain/types'
import { TextInput, Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface AttributePropertiesProps { readonly node: AttributeNode }

export const AttributeProperties = ({ node }: AttributePropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  const patch = (p: Partial<AttributeNode>): void => { update(node.id, p as Partial<AttributeNode>) }
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="attribute-properties">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('kind.attribute')}</h3>
      <TextInput label={t('name')} value={node.name} onChange={(e) => patch({ name: e.target.value })} />
      <Checkbox label={t('isKey')}          checked={node.isKey}          onChange={(e) => patch({ isKey: e.target.checked })} />
      <Checkbox label={t('isDiscriminant')} checked={node.isDiscriminant} onChange={(e) => patch({ isDiscriminant: e.target.checked })} />
      <Checkbox label={t('isMultivalued')}  checked={node.isMultivalued}  onChange={(e) => patch({ isMultivalued: e.target.checked })} />
      <Checkbox label={t('isDerived')}      checked={node.isDerived}      onChange={(e) => patch({ isDerived: e.target.checked })} />
      <Checkbox label={t('isComposite')}    checked={node.isComposite}    onChange={(e) => patch({ isComposite: e.target.checked })} />
    </div>
  )
}
```

### ISA editor — one boolean (`isTotal`)

- [ ] **Step 2: `ISAProperties.tsx`**

```tsx
// src/ui/properties/ISAProperties.tsx
import { useTranslation } from 'react-i18next'
import type { ISANode } from '@/domain/types'
import { Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface ISAPropertiesProps { readonly node: ISANode }

export const ISAProperties = ({ node }: ISAPropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="isa-properties">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('kind.isa')}</h3>
      <Checkbox
        label={t('isTotal')}
        checked={node.isTotal}
        onChange={(e) => update(node.id, { isTotal: e.target.checked } as Partial<ISANode>)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Tests**

Use the same factory pattern as Task 10's EntityProperties test. For `AttributeProperties` cover name + two representative booleans (`isKey`, `isMultivalued`). For `ISAProperties` cover the single `isTotal` toggle + kind-heading render.

- [ ] **Step 4: Wire into `PropertyPanel.tsx`**

Replace the last two placeholder branches so all four node kinds map to real editors. After this task, only the edge branch still falls back to placeholder — that lands in Task 12.

- [ ] **Step 5: Commit**

```bash
git add src/ui/properties/{AttributeProperties,ISAProperties}.tsx src/ui/properties/{AttributeProperties,ISAProperties}.test.tsx src/ui/properties/PropertyPanel.tsx
git commit -m "feat(ui): add AttributeProperties + ISAProperties editors"
```

---

## Task 12: `EdgeProperties`

**Files:**
- Create: `src/ui/properties/EdgeProperties.tsx` + `.test.tsx`
- Modify: `src/ui/properties/PropertyPanel.tsx` (replace edge placeholder)

Edge editor branches on `edge.kind`. Only `entity-relationship` has editable props (cardinality, participation, role). `attribute-of` and `isa-link` show kind + read-only source/target ids.

- [ ] **Step 1: Implementation**

```tsx
// src/ui/properties/EdgeProperties.tsx
import { useTranslation } from 'react-i18next'
import type {
  ERLink, EntityRelationshipEdge, Cardinality, Participation,
} from '@/domain/types'
import { TextInput } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface EdgePropertiesProps { readonly edge: ERLink }

const CARDINALITIES: readonly Cardinality[] = ['1', 'N', 'M']
const PARTICIPATIONS: readonly Participation[] = ['total', 'partial']

const EREdge = ({ edge }: { edge: EntityRelationshipEdge }) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateEdge)
  return (
    <>
      <label className="flex flex-col gap-1 text-xs text-slate-700">
        {t('cardinality')}
        <select
          className="h-9 rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
          value={edge.cardinality}
          onChange={(e) => update(edge.id, { cardinality: e.target.value as Cardinality })}
        >
          {CARDINALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-700">
        {t('participation')}
        <select
          className="h-9 rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
          value={edge.participation}
          onChange={(e) => update(edge.id, { participation: e.target.value as Participation })}
        >
          {PARTICIPATIONS.map((p) => (
            <option key={p} value={p}>
              {p === 'total' ? t('participationTotal') : t('participationPartial')}
            </option>
          ))}
        </select>
      </label>
      <TextInput
        label={t('role')}
        value={edge.role ?? ''}
        placeholder={t('rolePlaceholder')}
        onChange={(e) => update(edge.id, { role: e.target.value || undefined })}
      />
    </>
  )
}

export const EdgeProperties = ({ edge }: EdgePropertiesProps) => {
  const { t } = useTranslation('properties')
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="edge-properties" data-edge-kind={edge.kind}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(`kind.${edge.kind}`)}</h3>
      {edge.kind === 'entity-relationship' && <EREdge edge={edge} />}
      {edge.kind !== 'entity-relationship' && (
        <p className="text-xs text-slate-500">
          Source: {edge.sourceId}<br />
          Target: {edge.targetId}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Tests — ER edge cardinality + participation write back to store**

```tsx
// src/ui/properties/EdgeProperties.test.tsx
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EdgeProperties } from './EdgeProperties'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type EntityRelationshipEdge } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const mkERedge = (): EntityRelationshipEdge => {
  const s = useDiagramStore.getState().addNode({ kind: 'entity', name: 'A', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
  const t = useDiagramStore.getState().addNode({ kind: 'relationship', name: 'r', isIdentifying: false, position: { x: 300, y: 0 }, size: { width: 140, height: 70 } })
  const id = useDiagramStore.getState().addEdge({ kind: 'entity-relationship', sourceId: s, targetId: t, cardinality: '1', participation: 'partial', waypoints: [] })
  return useDiagramStore.getState().diagram.edgesById[id] as EntityRelationshipEdge
}

describe('EdgeProperties (entity-relationship)', () => {
  beforeEach(reset)

  it('renders cardinality, participation, role controls', () => {
    const edge = mkERedge()
    render(<EdgeProperties edge={edge} />)
    expect(screen.getByRole('combobox', { name: 'Cardinality' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Participation' })).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
  })

  it('changing cardinality writes to diagramStore', async () => {
    const edge = mkERedge()
    render(<EdgeProperties edge={edge} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Cardinality' }), 'N')
    const after = useDiagramStore.getState().diagram.edgesById[edge.id] as EntityRelationshipEdge
    expect(after.cardinality).toBe('N')
  })

  it('changing role to empty writes undefined (not empty string)', async () => {
    const edge = mkERedge()
    useDiagramStore.getState().updateEdge(edge.id, { role: 'manages' })
    render(<EdgeProperties edge={useDiagramStore.getState().diagram.edgesById[edge.id] as EntityRelationshipEdge} />)
    await userEvent.clear(screen.getByLabelText('Role'))
    const after = useDiagramStore.getState().diagram.edgesById[edge.id] as EntityRelationshipEdge
    expect(after.role).toBeUndefined()
  })
})

describe('EdgeProperties (non-ER edges)', () => {
  beforeEach(reset)

  it('attribute-of edge renders read-only summary, no editable controls', () => {
    const s = useDiagramStore.getState().addNode({ kind: 'attribute', name: 'id', isKey: true, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false, position: { x: 0, y: 0 }, size: { width: 90, height: 50 } })
    const t = useDiagramStore.getState().addNode({ kind: 'entity', name: 'A', isWeak: false, position: { x: 200, y: 0 }, size: { width: 120, height: 60 } })
    const id = useDiagramStore.getState().addEdge({ kind: 'attribute-of', sourceId: s, targetId: t, waypoints: [] })
    const edge = useDiagramStore.getState().diagram.edgesById[id]!
    const { container } = render(<EdgeProperties edge={edge} />)
    expect(container.querySelector('[data-edge-kind="attribute-of"]')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})
```

- [ ] **Step 3: Verify `diagramStore.updateEdge` exists**

Read `src/state/diagramStore.ts` — the Phase 2 store has `updateEdge: (id, patch) => void`. If named differently, rename. Should match the plan; confirm before coding.

- [ ] **Step 4: Wire into `PropertyPanel.tsx`**

Final PropertyPanel now dispatches every kind. Remove the `Placeholder` import + component.

- [ ] **Step 5: Commit**

```bash
git add src/ui/properties/EdgeProperties.tsx src/ui/properties/EdgeProperties.test.tsx src/ui/properties/PropertyPanel.tsx
git commit -m "feat(ui): add EdgeProperties editor (ER cardinality/participation/role)"
```

---

## Task 13: Inline rename — `useInlineRename` hook + `InlineRenameOverlay`

**Files:**
- Create: `src/canvas/hooks/useInlineRename.ts` + `.test.tsx`  (canvas-side — it's consumed by `InlineRenameOverlay.tsx` in the same layer; placing it under `src/ui/hooks/` would force a `canvas → ui` import that ESLint forbids)
- Modify: `src/canvas/hooks/index.ts` (add `useInlineRename` export)
- Create: `src/canvas/InlineRenameOverlay.tsx` + `.test.tsx`
- Modify: `src/canvas/ERCanvas.tsx` (mount the overlay inside `ERCanvasInner`)

Inline rename is triggered by:
- `F2` / `Enter` when a node is selected (keybinding registry handles the dispatch)
- Double-click on a node glyph

It renders an `<input>` positioned on top of the glyph in canvas coordinates. On Enter → commit. On Escape → cancel. On blur → commit.

**Design decision** (Step 1): **use a new `uiStore` slice** `inlineRename: { nodeId, initialValue } | null` rather than FSM events. The FSM already has a `RENAME` event (Phase 3 deferred-no-op); keep that wired as the trigger, but let the overlay live in UI state. Rationale: FSM transitions between edit states would clutter the machine; a thin store slice is simpler.

Alternative: add `startRename(nodeId)` / `commitRename(nodeId, value)` actions on `uiStore` that both the overlay and external triggers call. Keep `RENAME` on the FSM as a deferred-no-op (already is) OR make it call `uiStore.startRename(currentSelection)`.

Simplest path: a dedicated `useInlineRename` hook exposes `{ active, start, commit, cancel }` and subscribes to `uiStore.inlineRename`. External code calls `useInlineRename().start(nodeId)`; overlay subscribes and shows itself.

### Extend `uiStore` with an `inlineRename` slice

Add:
```ts
export interface InlineRenameState {
  readonly nodeId: NodeId
  readonly initialValue: string
}
// state:
readonly inlineRename: InlineRenameState | null
// actions:
startInlineRename: (state: InlineRenameState) => void
cancelInlineRename: () => void
// impl:
startInlineRename: (state) => set((s) => { s.inlineRename = state }),
cancelInlineRename: () => set((s) => { s.inlineRename = null }),
```

**Important:** import `NodeId` in `uiStore.ts`. This is fine because `uiStore` already depends on `@/domain`.

Not persisted.

- [ ] **Step 1: Extend uiStore + 2 tests.**

```ts
it('startInlineRename sets state', () => {
  useUiStore.getState().startInlineRename({ nodeId: 'x' as NodeId, initialValue: 'A' })
  expect(useUiStore.getState().inlineRename).toEqual({ nodeId: 'x', initialValue: 'A' })
})
it('cancelInlineRename clears state', () => {
  useUiStore.getState().startInlineRename({ nodeId: 'x' as NodeId, initialValue: 'A' })
  useUiStore.getState().cancelInlineRename()
  expect(useUiStore.getState().inlineRename).toBeNull()
})
```

- [ ] **Step 2: `useInlineRename` hook**

```ts
// src/canvas/hooks/useInlineRename.ts
import { useCallback } from 'react'
import type { NodeId, ERNode } from '@/domain/types'
import { useUiStore } from '@/state/uiStore'
import { useDiagramStore } from '@/state/diagramStore'

export interface InlineRenameApi {
  readonly active: { readonly nodeId: NodeId; readonly initialValue: string } | null
  readonly start: (nodeId: NodeId) => void
  readonly commit: (value: string) => void
  readonly cancel: () => void
}

const hasNameField = (n: ERNode): n is Extract<ERNode, { name: string }> =>
  n.kind === 'entity' || n.kind === 'relationship' || n.kind === 'attribute'

export const useInlineRename = (): InlineRenameApi => {
  const active = useUiStore((s) => s.inlineRename)
  const startAction = useUiStore((s) => s.startInlineRename)
  const cancelAction = useUiStore((s) => s.cancelInlineRename)

  const start = useCallback((nodeId: NodeId) => {
    const node = useDiagramStore.getState().diagram.nodesById[nodeId]
    if (!node || !hasNameField(node)) return    // ISA has no name — no-op
    startAction({ nodeId, initialValue: node.name })
  }, [startAction])

  const commit = useCallback((value: string) => {
    const current = useUiStore.getState().inlineRename
    if (!current) return
    const trimmed = value.trim()
    if (trimmed) useDiagramStore.getState().updateNode(current.nodeId, { name: trimmed } as Partial<ERNode>)
    cancelAction()
  }, [cancelAction])

  const cancel = useCallback(() => { cancelAction() }, [cancelAction])

  return { active, start, commit, cancel }
}
```

- [ ] **Step 3: Tests for the hook**

```tsx
// src/canvas/hooks/useInlineRename.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInlineRename } from './useInlineRename'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram, type NodeId } from '@/domain/types'

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useUiStore.setState({ inlineRename: null })
}

describe('useInlineRename', () => {
  beforeEach(reset)

  it('start(nodeId) seeds uiStore.inlineRename with current name', () => {
    const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    expect(useUiStore.getState().inlineRename).toEqual({ nodeId: id, initialValue: 'Foo' })
  })

  it('start on ISA node is a no-op (no name field)', () => {
    const id = useDiagramStore.getState().addNode({ kind: 'isa', isTotal: false, position: { x: 0, y: 0 }, size: { width: 100, height: 60 } })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('commit writes the new name and clears state', () => {
    const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    act(() => { result.current.commit('Bar') })
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Bar')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('commit with blank trimmed value leaves name unchanged but still clears state', () => {
    const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    act(() => { result.current.commit('   ') })
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Foo')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('cancel clears state without mutating the node', () => {
    const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    act(() => { result.current.cancel() })
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Foo')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })
})
```

- [ ] **Step 4: `InlineRenameOverlay` — canvas-side SVG overlay**

```tsx
// src/canvas/InlineRenameOverlay.tsx
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useInlineRename } from '@/canvas/hooks/useInlineRename'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'

export const InlineRenameOverlay = () => {
  const { active, commit, cancel } = useInlineRename()
  const diagram = useDiagramStore((s) => s.diagram)
  const zoom = useViewportStore((s) => s.zoom)
  const pan = useViewportStore((s) => s.pan)
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(active?.initialValue ?? '')

  // Seed the local value whenever a new rename begins.
  useEffect(() => {
    if (active) {
      setValue(active.initialValue)
      // Focus on next tick so the input exists.
      queueMicrotask(() => inputRef.current?.focus())
      queueMicrotask(() => inputRef.current?.select())
    }
  }, [active])

  if (!active) return null
  const node = diagram.nodesById[active.nodeId]
  if (!node) return null

  const screenX = node.position.x * zoom + pan.x
  const screenY = node.position.y * zoom + pan.y
  const width = node.size.width * zoom
  const height = node.size.height * zoom

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(value) }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKey}
      onBlur={() => commit(value)}
      className="absolute z-30 rounded border-2 border-blue-500 bg-white px-1 text-sm text-slate-900 outline-none"
      style={{ left: screenX, top: screenY, width, height }}
      data-role="inline-rename"
      aria-label="Rename element"
    />
  )
}
```

- [ ] **Step 5: Test the overlay (lightweight)**

```tsx
// src/canvas/InlineRenameOverlay.test.tsx
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineRenameOverlay } from './InlineRenameOverlay'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { useViewportStore } from '@/state/viewportStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useUiStore.setState({ inlineRename: null })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
}

describe('InlineRenameOverlay', () => {
  beforeEach(reset)

  it('renders nothing when no rename is active', () => {
    const { container } = render(<InlineRenameOverlay />)
    expect(container.querySelector('[data-role="inline-rename"]')).not.toBeInTheDocument()
  })

  it('renders an input with the initial value when rename is active', () => {
    const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 10, y: 20 }, size: { width: 120, height: 60 } })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
    render(<InlineRenameOverlay />)
    expect(screen.getByDisplayValue('Foo')).toBeInTheDocument()
  })

  it('Enter commits the new value', async () => {
    const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
    render(<InlineRenameOverlay />)
    const input = screen.getByDisplayValue('Foo')
    await userEvent.clear(input)
    await userEvent.type(input, 'Bar')
    await userEvent.keyboard('{Enter}')
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Bar')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('Escape cancels without mutating the node', async () => {
    const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
    render(<InlineRenameOverlay />)
    const input = screen.getByDisplayValue('Foo')
    await userEvent.clear(input)
    await userEvent.type(input, 'Bar')
    await userEvent.keyboard('{Escape}')
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Foo')
  })
})
```

- [ ] **Step 6: Mount the overlay inside `ERCanvasInner`**

Open `src/canvas/ERCanvas.tsx` and add `<InlineRenameOverlay />` inside the wrapper div, BELOW `<ReactFlow>` and the snap overlay. It positions itself absolutely, so no layout impact.

```tsx
import { InlineRenameOverlay } from './InlineRenameOverlay'
// …
return (
  <div className="h-full w-full flex-1 relative" {...handlers}>
    <ReactFlow …>{…}</ReactFlow>
    {activeGuides.length > 0 && <SnapOverlay …/>}
    <InlineRenameOverlay />
  </div>
)
```

Also extend `src/canvas/ERCanvas.test.tsx` by one test:
```ts
it('renders InlineRenameOverlay when uiStore.inlineRename is active', () => {
  const id = useDiagramStore.getState().addNode({ kind: 'entity', name: 'Foo', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
  useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
  render(<ERCanvas />)
  expect(screen.getByDisplayValue('Foo')).toBeInTheDocument()
})
```

- [ ] **Step 7: Commit**

```bash
git add src/state/uiStore.ts src/state/uiStore.test.ts src/canvas/hooks/useInlineRename.ts src/canvas/hooks/useInlineRename.test.tsx src/canvas/hooks/index.ts src/canvas/InlineRenameOverlay.tsx src/canvas/InlineRenameOverlay.test.tsx src/canvas/ERCanvas.tsx src/canvas/ERCanvas.test.tsx
git commit -m "feat(canvas): add inline rename (useInlineRename hook + overlay input)"
```

---

## Task 14: `ui/menu/` — `MenuBar`, `MenuItem`, `FileMenu`, `EditMenu`, `ViewMenu`, `HelpMenu`

**Files:**
- Create: `src/ui/menu/MenuItem.tsx` + `.test.tsx`
- Create: `src/ui/menu/MenuBar.tsx` + `.test.tsx`
- Create: `src/ui/menu/FileMenu.tsx` + `.test.tsx`
- Create: `src/ui/menu/EditMenu.tsx` + `.test.tsx`
- Create: `src/ui/menu/ViewMenu.tsx` + `.test.tsx`
- Create: `src/ui/menu/HelpMenu.tsx` + `.test.tsx`

Top menu bar with dropdown menus. Each menu is a button that opens a list of menu items. Design decision: use a **click-triggered dropdown** (not a native `<select>` or fancy hover menu) to keep keyboard accessibility straightforward.

### `MenuItem.tsx` — shared primitive for menu entries

```tsx
// src/ui/menu/MenuItem.tsx
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
```

Tests: onClick fires, disabled blocks, shortcut rendered when provided.

### `MenuBar.tsx` — orchestrates open/close across menus

```tsx
// src/ui/menu/MenuBar.tsx
import { useCallback, useState } from 'react'
import { FileMenu } from './FileMenu'
import { EditMenu } from './EditMenu'
import { ViewMenu } from './ViewMenu'
import { HelpMenu } from './HelpMenu'

type OpenMenu = 'file' | 'edit' | 'view' | 'help' | null

export const MenuBar = () => {
  const [open, setOpen] = useState<OpenMenu>(null)
  const close = useCallback(() => setOpen(null), [])

  return (
    <nav role="menubar" aria-label="Main menu" className="flex h-full items-center gap-1 px-2 text-sm">
      <FileMenu isOpen={open === 'file'} onOpen={() => setOpen('file')} onClose={close} />
      <EditMenu isOpen={open === 'edit'} onOpen={() => setOpen('edit')} onClose={close} />
      <ViewMenu isOpen={open === 'view'} onOpen={() => setOpen('view')} onClose={close} />
      <HelpMenu isOpen={open === 'help'} onOpen={() => setOpen('help')} onClose={close} />
    </nav>
  )
}
```

Tests: each menu button toggles its own dropdown; opening one closes others.

### `FileMenu.tsx` — codec-aware, but stubs for Phase 5

```tsx
// src/ui/menu/FileMenu.tsx
import { useTranslation } from 'react-i18next'
import { MenuItem } from './MenuItem'
import { useUiStore } from '@/state/uiStore'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'

export interface FileMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

const phase5Toast = (pushToast: ReturnType<typeof useUiStore.getState>['pushToast']): void => {
  pushToast({
    id: `phase5-${Date.now()}`,
    kind: 'info',
    messageKey: 'menu:notYetAvailable',
  })
}

export const FileMenu = ({ isOpen, onOpen, onClose }: FileMenuProps) => {
  const { t } = useTranslation('menu')
  const pushToast = useUiStore((s) => s.pushToast)
  const toastPhase5 = () => { phase5Toast(pushToast); onClose() }

  const handleNew = () => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
    onClose()
  }

  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={isOpen ? onClose : onOpen}
        className="rounded px-2 py-1 hover:bg-slate-100"
      >
        {t('file.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('file.new')} onSelect={handleNew} /></li>
          <li><MenuItem label={t('file.open')} onSelect={toastPhase5} shortcut="Ctrl+O" /></li>
          <li><MenuItem label={t('file.save')} onSelect={toastPhase5} shortcut="Ctrl+S" /></li>
          <li><MenuItem label={t('file.exportPng')} onSelect={toastPhase5} /></li>
          <li><MenuItem label={t('file.exportSvg')} onSelect={toastPhase5} /></li>
          <li><MenuItem label={t('file.exportMermaid')} onSelect={toastPhase5} /></li>
        </ul>
      )}
    </div>
  )
}
```

### `EditMenu.tsx` — wires FSM events for undo/redo/cut/copy/paste/duplicate/selectAll

```tsx
// src/ui/menu/EditMenu.tsx
import { useTranslation } from 'react-i18next'
import { MenuItem } from './MenuItem'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { EditorEvent } from '@/interaction/events'

export interface EditMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

const dispatch = (e: EditorEvent): void => {
  useInteractionStore.getState().send(e)
}

export const EditMenu = ({ isOpen, onOpen, onClose }: EditMenuProps) => {
  const { t } = useTranslation('menu')
  const go = (e: EditorEvent) => () => { dispatch(e); onClose() }
  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={isOpen ? onClose : onOpen}
        className="rounded px-2 py-1 hover:bg-slate-100"
      >
        {t('edit.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('edit.undo')} shortcut="Ctrl+Z" onSelect={go({ type: 'UNDO' })} /></li>
          <li><MenuItem label={t('edit.redo')} shortcut="Ctrl+Shift+Z" onSelect={go({ type: 'REDO' })} /></li>
          <li><MenuItem label={t('edit.cut')} shortcut="Ctrl+X" onSelect={go({ type: 'CUT' })} /></li>
          <li><MenuItem label={t('edit.copy')} shortcut="Ctrl+C" onSelect={go({ type: 'COPY' })} /></li>
          <li><MenuItem label={t('edit.paste')} shortcut="Ctrl+V" onSelect={go({ type: 'PASTE' })} /></li>
          <li><MenuItem label={t('edit.duplicate')} shortcut="Ctrl+D" onSelect={go({ type: 'DUPLICATE' })} /></li>
          <li><MenuItem label={t('edit.delete')} shortcut="Del" onSelect={go({ type: 'DELETE' })} danger /></li>
          <li><MenuItem label={t('edit.selectAll')} shortcut="Ctrl+A" onSelect={go({ type: 'SELECT_ALL' })} /></li>
          <li><MenuItem label={t('edit.invertSelection')} shortcut="Shift+Alt+A" onSelect={go({ type: 'INVERT_SELECTION' })} /></li>
        </ul>
      )}
    </div>
  )
}
```

### `ViewMenu.tsx` — toggles for grid, alignment, properties panel, zoom

```tsx
// src/ui/menu/ViewMenu.tsx
import { useTranslation } from 'react-i18next'
import { MenuItem } from './MenuItem'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useUiStore } from '@/state/uiStore'

export interface ViewMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

export const ViewMenu = ({ isOpen, onOpen, onClose }: ViewMenuProps) => {
  const { t } = useTranslation('menu')
  const snap = useUiStore((s) => s.snap)
  const setSnap = useUiStore((s) => s.setSnap)
  const togglePanel = useUiStore((s) => s.togglePanel)
  const send = useInteractionStore.getState().send

  const close = (fn: () => void) => () => { fn(); onClose() }

  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={isOpen ? onClose : onOpen}
        className="rounded px-2 py-1 hover:bg-slate-100"
      >
        {t('view.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('view.zoomIn')} shortcut="Ctrl++" onSelect={close(() => send({ type: 'ZOOM_IN' }))} /></li>
          <li><MenuItem label={t('view.zoomOut')} shortcut="Ctrl+-" onSelect={close(() => send({ type: 'ZOOM_OUT' }))} /></li>
          <li><MenuItem label={t('view.fitView')} shortcut="Ctrl+0" onSelect={close(() => send({ type: 'FIT' }))} /></li>
          <li><MenuItem
            label={`${t('view.grid')}${snap.gridEnabled ? ' ✓' : ''}`}
            onSelect={close(() => setSnap({ gridEnabled: !snap.gridEnabled }))}
          /></li>
          <li><MenuItem
            label={`${t('view.alignment')}${snap.alignmentEnabled ? ' ✓' : ''}`}
            onSelect={close(() => setSnap({ alignmentEnabled: !snap.alignmentEnabled }))}
          /></li>
          <li><MenuItem label={t('view.properties')} onSelect={close(() => togglePanel('properties'))} /></li>
        </ul>
      )}
    </div>
  )
}
```

### `HelpMenu.tsx`

```tsx
// src/ui/menu/HelpMenu.tsx
import { useTranslation } from 'react-i18next'
import { MenuItem } from './MenuItem'
import { useUiStore } from '@/state/uiStore'
import { nanoid } from 'nanoid'

export interface HelpMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

export const HelpMenu = ({ isOpen, onOpen, onClose }: HelpMenuProps) => {
  const { t } = useTranslation('menu')
  const pushModal = useUiStore((s) => s.pushModal)
  const openCheatsheet = () => {
    pushModal({ id: nanoid(), kind: 'cheatsheet', props: {} })
    onClose()
  }
  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={isOpen ? onClose : onOpen}
        className="rounded px-2 py-1 hover:bg-slate-100"
      >
        {t('help.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('help.cheatsheet')} shortcut="?" onSelect={openCheatsheet} /></li>
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 1: Implement `MenuItem.tsx` + test**

Basic render test + click test + disabled test + shortcut render test.

- [ ] **Step 2: Implement `FileMenu.tsx` + test**

Tests:
- Clicking the trigger toggles open/close.
- Clicking "New" clears the diagram.
- Clicking "Open" / "Save" pushes a Phase-5 toast.

- [ ] **Step 3: Implement `EditMenu.tsx` + test**

Test: clicking "Undo" dispatches `{ type: 'UNDO' }` on the FSM. Mock `useInteractionStore.getState().send` with `vi.spyOn(useInteractionStore, 'getState')...` to verify.

- [ ] **Step 4: Implement `ViewMenu.tsx` + test**

Tests:
- Toggling "Grid" calls `setSnap({ gridEnabled: true })`.
- Clicking "Zoom in" dispatches `{ type: 'ZOOM_IN' }`.

- [ ] **Step 5: Implement `HelpMenu.tsx` + test**

Test: clicking "Keyboard shortcuts" pushes a cheatsheet modal onto `uiStore.modals`.

- [ ] **Step 6: Implement `MenuBar.tsx` + test**

Test: opening one menu closes any other that was open.

- [ ] **Step 7: Commit**

```bash
git add src/ui/menu/
git commit -m "feat(ui): add MenuBar with File/Edit/View/Help menus + codec stubs"
```

---

## Task 15: Reintroduce `connectToGeneralization` FSM state + right-click-on-ISA wiring

**Files:**
- Modify: `src/interaction/events.ts` (add `CONNECT_CHILD_TO_ISA` event)
- Modify: `src/interaction/context.ts` — only if the existing `connectionFromId` field is missing. Read the file first; Phase-3's context already has it and no change is needed.
- Modify: `src/interaction/machine.ts` (re-introduce the deferred state)
- Modify: `src/interaction/actions.ts` (add `connectChildToIsa` action)
- Modify: `src/interaction/machine.test.ts` / new test file if too large
- Modify: `src/canvas/notation-adapters/ISANode.tsx` (add right-click → context menu)

Phase 3 deliberately removed `connectToGeneralization` from the machine with the CHANGELOG note: *"re-enters in Phase 6 when the right-click-on-ISA UI is wired."* This task does that.

### Flow

1. User right-clicks an ISA node → `ISANode`'s `onContextMenu` handler opens `uiStore.contextMenu` with a single item: "Add child entity".
2. User picks the item → dispatches `{ type: 'CONNECT_CHILD_TO_ISA', isaId }` to the FSM.
3. FSM transitions to `connectToGeneralization.waitingForChild` state with the isaId stored in context.
4. User clicks an entity node (dispatches `NODE_POINTER_DOWN`).
5. Action: `connectChildToIsa` adds an `isa-link` edge from the ISA node to the picked entity (role `child`), then returns to idle.

### Event addition

```ts
// src/interaction/events.ts — add to the union:
| { type: 'CONNECT_CHILD_TO_ISA'; isaId: NodeId }
```

### Context addition (if needed)

Phase 3's context already has `connectionFromId: NodeId | null`. Reuse it — when entering `connectToGeneralization.waitingForChild`, set `connectionFromId` to the ISA's id.

### Machine state

```ts
// In states block:
connectToGeneralization: {
  initial: 'waitingForChild',
  states: {
    waitingForChild: {
      on: {
        NODE_POINTER_DOWN: {
          target: '#editor.selecting.idle',
          actions: ['connectChildToIsaAction', 'resetContext'],
        },
        ESCAPE: { target: '#editor.selecting.idle', actions: 'resetContext' },
      },
    },
  },
},
```

And add a top-level `CONNECT_CHILD_TO_ISA` transition that sets context and goes to `connectToGeneralization`:

```ts
// In the root `on` block:
CONNECT_CHILD_TO_ISA: {
  target: '.connectToGeneralization.waitingForChild',
  actions: 'beginConnectChildToIsa',
},
```

### Action

```ts
// src/interaction/actions.ts — add:
import { nanoid } from 'nanoid'
import { useDiagramStore } from '@/state/diagramStore'

export const beginConnectChildToIsa = assign({
  connectionFromId: ({ event }) => (event as { isaId: NodeId }).isaId,
})

export const connectChildToIsaAction = (
  { context }: { context: EditorContext },
  { nodeId }: { type: 'NODE_POINTER_DOWN'; nodeId: NodeId },
): void => {
  if (!context.connectionFromId) return
  const child = useDiagramStore.getState().diagram.nodesById[nodeId]
  if (!child || child.kind !== 'entity') return       // only entities can be ISA children
  useDiagramStore.getState().addEdge({
    kind: 'isa-link',
    sourceId: context.connectionFromId,
    targetId: nodeId,
    role: 'child',
    waypoints: [],
  })
}
```

**Note on XState v5 action signature:** the actual pattern in the codebase uses `({ context, event }) => ...`. Match the existing shape in `src/interaction/actions.ts` — don't invent a new signature.

### Wire right-click on ISANode

Modify `src/canvas/notation-adapters/ISANode.tsx`:

```tsx
// Inside the component, add an onContextMenu handler to the <svg>.
// The NodeProps bag has no onContextMenu; use the outer wrapper's.
//
// Simplest: wrap the glyph in a <div onContextMenu={...}>. Or add the handler
// directly to the <svg> element (SVG also supports contextmenu).
```

```tsx
import { useTranslation } from 'react-i18next'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useUiStore } from '@/state/uiStore'
// …
const { t } = useTranslation('menu')
const openContextMenu = useUiStore((s) => s.openContextMenu)
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault()
  openContextMenu({
    at: { x: e.clientX, y: e.clientY },
    items: [{
      id: 'add-child',
      labelKey: 'isa.addChild',    // new key — add to menu.json
      onSelect: () => {
        useInteractionStore.getState().send({ type: 'CONNECT_CHILD_TO_ISA', isaId: nodeId })
      },
    }],
  })
}
return (
  <svg width={…} height={…} overflow="visible" onContextMenu={handleContextMenu}>
    <ISAGlyph {…} />
  </svg>
)
```

Add to EN `menu.json`:
```json
"isa": { "addChild": "Add child entity" }
```

Copy to IT `menu.json`.

- [ ] **Step 1: Extend `events.ts`**

Add the event to the union.

- [ ] **Step 2: Extend `actions.ts`**

Add both actions. Pattern-match against existing action signatures in the file.

- [ ] **Step 3: Extend `machine.ts`**

Add the state + the root-level event transition. Register the actions in the `setup({ actions })` block.

- [ ] **Step 4: Tests for FSM**

Add to `src/interaction/machine.drawing.test.ts` (or a new file if that one is already near the 350-line cap). Cover:
- `CONNECT_CHILD_TO_ISA` transitions into `connectToGeneralization.waitingForChild`.
- `NODE_POINTER_DOWN` from that state adds an `isa-link` edge to the diagramStore and returns to `selecting.idle`.
- `ESCAPE` returns to idle without creating an edge.
- Picking a non-entity node is a no-op (no edge created, but state still returns to idle).

- [ ] **Step 5: Wire right-click into `ISANode.tsx` + test**

Test: right-click on the ISANode glyph opens `uiStore.contextMenu` with one item whose id is `'add-child'`. Clicking that item dispatches `CONNECT_CHILD_TO_ISA` to the FSM.

Run the full suite — FSM transition coverage stays intact.

- [ ] **Step 6: Commit**

```bash
git add src/interaction/events.ts src/interaction/actions.ts src/interaction/machine.ts src/interaction/machine*.test.ts src/canvas/notation-adapters/ISANode.tsx src/canvas/notation-adapters/ISANode.test.tsx src/platform/i18n/locales/en/menu.json src/platform/i18n/locales/it/menu.json
git commit -m "feat(interaction,ui): reintroduce connectToGeneralization + right-click-on-ISA UI"
```

---

## Task 16: Wire everything into `App.tsx`

**File:**
- Modify: `src/App.tsx`

Replace the current canvas-only App with a full shell that mounts the menu bar, toolbar, canvas, property panel, and overlays.

- [ ] **Step 1: Rewrite `App.tsx`**

```tsx
// src/App.tsx
import { ERCanvas } from './canvas/ERCanvas'
import { AppShell } from './ui/app/AppShell'
import { MenuBar } from './ui/menu/MenuBar'
import { Toolbar } from './ui/toolbar/Toolbar'
import { PropertyPanel } from './ui/properties/PropertyPanel'
import { ToastStack } from './ui/overlays/ToastStack'
import { ModalStack } from './ui/overlays/ModalStack'
import { ContextMenu } from './ui/overlays/ContextMenu'

export const App = () => (
  <AppShell
    menuBar={<MenuBar />}
    toolbar={<Toolbar />}
    canvas={<ERCanvas />}
    properties={<PropertyPanel />}
    overlays={<>
      <ToastStack />
      <ModalStack />
      <ContextMenu />
    </>}
  />
)
```

- [ ] **Step 2: Smoke test — `App.test.tsx`**

Create `src/App.test.tsx`:
```tsx
import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { App } from './App'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

describe('App', () => {
  it('mounts menu, toolbar, canvas, and property panel', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('menubar')).toBeInTheDocument()
    expect(container.querySelector('[data-role="toolbar"]')).toBeInTheDocument()
    expect(container.querySelector('.react-flow')).toBeInTheDocument()
    expect(container.querySelector('[data-role="empty-panel"]')).toBeInTheDocument()
  })

  it('opens the File menu when clicking the File button', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    render(<App />)
    await userEvent.click(screen.getByRole('menuitem', { name: 'File' }))
    expect(screen.getByRole('menuitem', { name: /New diagram/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Typecheck + lint + build**

```
pnpm typecheck && pnpm lint && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat(app): mount full UI shell (menu + toolbar + canvas + props + overlays)"
```

---

## Task 17: End-to-end UI integration test

**File:**
- Create: `src/ui/integration.test.tsx`

Spec §10.8 exit: *"creating → renaming → saving → reopening through full UI produces identical state"*. Since Phase 5 codecs aren't live, we simulate "save → reopen" via a serialize/deserialize round-trip of the raw `diagram` object (identity check via JSON.stringify). Phase 5 replaces this with a real codec call.

### Test scenarios

1. **Create via toolbar:** click "Entity" tool → click canvas → entity appears in diagramStore + glyph renders. (Repeats Task 17 / Phase 4 but now driven by the UI toolbar, not raw FSM events.)
2. **Rename via property panel:** select the new entity → property panel shows it → change name → store reflects.
3. **Rename via inline overlay:** double-click a node (or press F2 when selected) → input appears → type → Enter → store reflects.
4. **Full UI round-trip:** create two entities + one relationship via the toolbar, edit their names via the property panel, serialise the diagram, clear it, rehydrate from the serialised form, confirm the DOM after rehydrate matches the pre-clear snapshot.

The "F2 rename" scenario needs a **keybinding addition** — confirm `src/interaction/keybindings.ts` has `F2` and/or `Enter` bound to `{ type: 'RENAME' }`, and that the FSM's root-level `RENAME` handler (Phase 3 deferred no-op) is upgraded to call `startInlineRename` for the currently-selected node. If not, this is **the last piece of Task 17 — upgrade the `RENAME` handler** to call `useUiStore.getState().startInlineRename(...)`.

### Test code

```tsx
// src/ui/integration.test.tsx
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram, type Diagram } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const resetAll = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
  useUiStore.setState({ modals: [], toasts: [], contextMenu: null, inlineRename: null })
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

beforeEach(resetAll)

describe('UI integration — create via toolbar', () => {
  it('clicking the Entity tool then the canvas creates and renders an entity', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    // The FSM is now in placing.entity. Simulate canvas click via FSM events
    // (driving real DOM clicks on React Flow in jsdom is brittle — the toolbar
    // dispatch is the UI contract; canvas dispatch is already tested in Phase 4).
    useInteractionStore.getState().send({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 200, y: 200 },
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
      button: 'left',
    })
    useInteractionStore.getState().send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 200 } })
    const diagram = useDiagramStore.getState().diagram
    expect(diagram.nodeOrder).toHaveLength(1)
    expect(diagram.nodesById[diagram.nodeOrder[0]].kind).toBe('entity')
  })
})

describe('UI integration — property-panel rename', () => {
  it('selecting an entity then editing its name via the property panel writes to the store', async () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Foo', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({ selectedNodeIds: new Set([id]), selectedEdgeIds: new Set(), rubberband: null })
    render(<App />)
    const input = screen.getByDisplayValue('Foo')
    await userEvent.clear(input)
    await userEvent.type(input, 'Bar')
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Bar')
  })
})

describe('UI integration — inline rename overlay', () => {
  it('triggering inline rename via uiStore + committing writes to the store', async () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Foo', isWeak: false,
      position: { x: 100, y: 100 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({ selectedNodeIds: new Set([id]), selectedEdgeIds: new Set(), rubberband: null })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
    render(<App />)
    const input = screen.getByDisplayValue('Foo')
    await userEvent.clear(input)
    await userEvent.type(input, 'Renamed{Enter}')
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Renamed')
  })
})

describe('UI integration — save/reopen simulated round-trip', () => {
  it('JSON round-trip of the diagram state produces identical rendered DOM', async () => {
    // Setup: create 2 entities + 1 relationship via direct store calls (avoids
    // the toolbar-click race). Edit a name via property panel.
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 300, y: 0 }, size: { width: 120, height: 60 },
    })
    useDiagramStore.getState().addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: b,
      cardinality: 'N', participation: 'partial', waypoints: [],
    })

    // Serialise.
    const before: Diagram = structuredClone(useDiagramStore.getState().diagram) as Diagram
    const beforeJson = JSON.stringify(before)

    // Clear.
    useDiagramStore.setState({ diagram: emptyDiagram() })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)

    // Rehydrate.
    useDiagramStore.setState({ diagram: JSON.parse(beforeJson) as Diagram })

    // Render + assert the names still appear.
    render(<App />)
    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(await screen.findByText('B')).toBeInTheDocument()
  })
})
```

- [ ] **Step 1: Fix the FSM `RENAME` handler if needed**

Read `src/interaction/machine.ts` and `actions.ts`. If `RENAME` is still a no-op:

Add an action `beginRenameSelected`:
```ts
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { useDiagramStore } from '@/state/diagramStore'

export const beginRenameSelected = (): void => {
  const selected = useSelectionStore.getState().selectedNodeIds
  if (selected.size !== 1) return
  const [id] = [...selected]
  const node = useDiagramStore.getState().diagram.nodesById[id]
  if (!node) return
  if (node.kind === 'isa') return     // ISA has no name
  useUiStore.getState().startInlineRename({ nodeId: id, initialValue: node.name })
}
```

Wire `RENAME: { actions: 'beginRenameSelected' }` at the root level of the machine. Register in `setup({ actions })`.

Keybinding registry should already map `F2` and `Enter` to `RENAME` (check Phase 3's `keybindings.ts`; if not, add them).

- [ ] **Step 2: Run integration tests**

```
pnpm vitest run src/ui/integration.test.tsx
```

All four scenarios should pass.

- [ ] **Step 3: Commit**

```bash
git add src/ui/integration.test.tsx src/interaction/actions.ts src/interaction/machine.ts src/interaction/keybindings.ts
git commit -m "test(ui): add Phase-6 integration tests (toolbar place, panel rename, inline rename, round-trip)"
```

---

## Task 18: Coverage thresholds + barrel + CHANGELOG + final verification

**Files:**
- Modify: `vitest.config.ts`
- Create: `src/ui/index.ts` (barrel)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add coverage thresholds**

Extend `coverage.thresholds` in `vitest.config.ts` with:

```ts
'src/ui/primitives/**':   { statements: 85, branches: 75, functions: 85, lines: 85 },
'src/ui/overlays/**':     { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/ui/properties/**':   { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/ui/toolbar/**':      { statements: 85, branches: 75, functions: 85, lines: 85 },
'src/ui/menu/**':         { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/ui/**':              { statements: 80, branches: 70, functions: 80, lines: 80 },
'src/platform/i18n/**':   { statements: 80, branches: 70, functions: 80, lines: 80 },
```

Keep all Phase 1-4 thresholds intact.

- [ ] **Step 2: Create `src/ui/index.ts` barrel**

```ts
// Compose the public surface of the UI layer for App.tsx + future tests.
export { AppShell } from './app/AppShell'
export { MenuBar } from './menu/MenuBar'
export { Toolbar } from './toolbar/Toolbar'
export { PropertyPanel } from './properties/PropertyPanel'
export { ToastStack } from './overlays/ToastStack'
export { ModalStack } from './overlays/ModalStack'
export { ContextMenu } from './overlays/ContextMenu'
// Note: `useInlineRename` lives in `src/canvas/hooks/` (not `src/ui/hooks/`)
// because it's consumed by `src/canvas/InlineRenameOverlay.tsx`, and a
// `canvas → ui` import would violate ESLint's layer rule. UI callers that
// want to start a rename should go through `uiStore.startInlineRename` directly.
```

- [ ] **Step 3: Run full coverage**

```
pnpm vitest run --coverage
```

All thresholds must pass. Fill any gaps with targeted tests — do not lower thresholds.

- [ ] **Step 4: Add Phase 6 CHANGELOG entry**

Prepend to `CHANGELOG.md` (ABOVE the Phase 4 entry):

```markdown
## [v2 / Phase 6] — 2026-04-23

### Added

- UI shell under [src/ui/](src/ui/) — menu, toolbar, property panel, overlays (toasts, modals, context menu), inline rename:
  - [app/AppShell.tsx](src/ui/app/AppShell.tsx) — three-pane responsive layout.
  - [toolbar/Toolbar.tsx](src/ui/toolbar/Toolbar.tsx) — reads `chenPlugin.tools`, dispatches `PICK_TOOL`, drag-from-toolbar via `application/x-er-tool` MIME.
  - [menu/](src/ui/menu/) — `MenuBar` + `FileMenu`/`EditMenu`/`ViewMenu`/`HelpMenu`. File menu stubs to Phase-5 toasts until codecs land.
  - [properties/](src/ui/properties/) — `PropertyPanel` + per-kind editors (`Entity` / `Relationship` / `Attribute` / `ISA` / `Edge` / multi-select / empty).
  - [overlays/](src/ui/overlays/) — `ToastStack`, `ModalStack`, `CheatsheetModal`, `ConfirmModal`, `ErrorModal`, `ContextMenu`.
  - [hooks/useInlineRename.ts](src/ui/hooks/useInlineRename.ts) + [canvas/InlineRenameOverlay.tsx](src/canvas/InlineRenameOverlay.tsx) — F2/dblclick inline rename.
  - [primitives/](src/ui/primitives/) — `Button`, `IconButton`, `TextInput`, `Checkbox`, `KeyboardShortcut`.
- i18n bootstrap: [platform/i18n/init.ts](src/platform/i18n/init.ts) + `common`/`toolbar`/`menu`/`properties`/`modals` locale bundles for EN and IT (IT stubs copy EN — Phase 7 translates).
- `uiStore.contextMenu` + `uiStore.inlineRename` slices (not persisted).
- FSM re-enters `connectToGeneralization.waitingForChild` state + new `CONNECT_CHILD_TO_ISA` event, reached via right-click on an ISA glyph. Matches spec §4.6; was deferred from Phase 3.
- FSM `RENAME` root-level handler upgraded from no-op to a `beginRenameSelected` action that calls `uiStore.startInlineRename` for the selected node.
- Coverage thresholds for `src/ui/**` and `src/platform/i18n/**`.

### Changed

- `src/App.tsx` — mounts the full shell instead of just the canvas.
- `src/main.tsx` — initialises i18next before render.
- `src/canvas/ERCanvas.tsx` — mounts the `InlineRenameOverlay`.
- `src/canvas/notation-adapters/ISANode.tsx` — opens the context menu on right-click with "Add child entity".

### Notes

- Phase 5 codec actions are stubbed: File menu items push "Available in Phase 5" toasts. Real `save` / `open` / `export` wire up when Phase 5 lands.
- Phase 7 completes the Italian bundle and wires query-param overrides (`?lang`, `?readonly`, `?examMode`). Phase 6 adds a `readOnly` UI flag but does not auto-populate it from the URL.
- The "create → rename → save → reopen" exit criterion (spec §10.8) is exercised by `src/ui/integration.test.tsx`'s JSON round-trip. A real codec round-trip replaces it in Phase 5.
- Phase 4's pending items closed by this phase: the FSM `RENAME` no-op is now wired.
- Context menu is a separate `uiStore.contextMenu` slice (not a modal) because it's cursor-anchored with outside-click-to-dismiss — different lifecycle than centred modals.
- NNN unit tests passing; build, typecheck, and lint clean.
```

(Replace `NNN` with the actual final test count from `pnpm test` output.)

- [ ] **Step 5: Final verification**

```
pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm vitest run --coverage
```

All green.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/ui/index.ts CHANGELOG.md
git commit -m "chore(phase-6): add ui/** coverage thresholds + barrel + CHANGELOG"
```

---

## Self-review checklist

- [ ] **Spec §7.10 — toasts/modals/responsive layout:** ToastStack ✅, ModalStack ✅, ConfirmModal ✅, CheatsheetModal ✅, ErrorModal ✅, three-pane AppShell ✅. Collapsing-on-tablet is CSS-only; `uiStore.panels.properties` toggle already ships.
- [ ] **Spec §7.2 — cheatsheet from registry:** `CheatsheetModal` iterates `keybindings` ✅.
- [ ] **Spec §7.7 — drag-from-toolbar:** `dragFromToolbar.ts` + `Toolbar` `onDragStart` ✅.
- [ ] **Spec §9.4–9.5 — per-kind property editors:** all five kinds covered ✅.
- [ ] **Spec §10.8 exit:** integration test covers create → rename → round-trip ✅.
- [ ] **Spec §12.4 open item 2 (ISA orientation):** confirmed top-down in Phase 4.
- [ ] **Phase-3 deferral closed:** `connectToGeneralization` FSM state re-introduced in Task 15.
- [ ] **Placeholder scan:** no TBD/TODO outside of the Phase-5 codec stub (File menu actions) and Phase-7 i18n stubs (IT bundle copies EN). Both are intentional deferrals.
- [ ] **Layer rules:**
  - `ui/**` imports from `domain`, `platform`, `state`, `interaction`, `notation`, `canvas` ✅.
  - `useInlineRename` lives in `src/canvas/hooks/` (not `src/ui/hooks/`) — required because `InlineRenameOverlay.tsx` consumes it and `canvas → ui` is forbidden. Folded into Task 13 file paths.
  - `useReadOnly` (if shipped later) can live under `src/ui/hooks/` since `ui/` → `state/` is allowed. Phase 6 does not need it yet — the readOnly flag isn't populated until Phase 7 wires query params.

- [ ] **Type consistency:** `Modal.kind` is a string at the store level; the `renderModal` switch in `ModalStack` adds cases for `confirm`/`error`/`cheatsheet`. Consumer-facing types are the `Props` interfaces per modal; `pushModal` spreads them via `props`.
- [ ] **Named exports only:** enforced by ESLint.
- [ ] **Test discipline:** every component has at least one behavioural assertion (not just structural render). Panel → store write paths are covered. FSM → UI integration is exercised.
- [ ] **No scope creep:** Moodle bridge, Italian translations, query-param wiring, real codec save/open/export stay out of Phase 6 per §10.8/§10.9 split.

**Target total:** ≈80-100 new tests added across the phase. Final `pnpm test` should land in the 580-620 range (from Phase 4's 498).

---

## Execution handoff

After saving, offer the usual execution choice:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task with the full task text, reviewing spec compliance + code quality between tasks.
**2. Inline Execution** — I execute tasks in this session with checkpoints.
