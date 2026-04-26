# Phase 7 — Platform + i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the platform primitives (`platform/fs/` file I/O + `platform/imageExport/` PNG/SVG), the remaining query-param handlers (`?lang`, `?validation`, `?readonly`, `?embed` — `?examMode` already shipped), complete the Italian locale bundles, and add a locale-key linter to CI. Moodle postMessage bridge is explicitly deferred — it lives with the codec glue at the end of Phase 5 so it can carry real payloads instead of a stub contract.

**Architecture:** Stays inside the Phase 2 layer diagram: `platform/` depends only on `domain/`; query-param adapters live in `app/` and write to the Zustand stores (the same pattern `examMode.ts` already uses). The FSM never reads URLs directly — it reads `uiStore.readonly` like any other store flag. UI components check `uiStore.readonly` / `uiStore.examMode` / `uiStore.embed` and self-hide, matching the exam-mode precedent (hide > disable). i18n stays i18next-static (bundles imported at build time, no fetch), and `?lang` is applied once at boot plus whenever `uiStore.language` changes.

**Tech Stack:** TypeScript 5.9, React 19, `@xyflow/react` 12 (for `toImage`), Zustand 5 (existing stores), i18next 25 + react-i18next (existing), Vitest 3 + `@testing-library/react` 16 for hook/component tests, Node scripts for the locale linter.

**Reference spec:** [docs/superpowers/specs/2026-04-22-target-architecture-design.md](../specs/2026-04-22-target-architecture-design.md) §10.9 (Phase 7 exit), §9.11–9.15 (Moodle integration surface this plan partially covers), §9.12 (i18n). When this plan and the spec conflict, the spec wins.

---

## Preconditions

Before starting Task 1, verify:

- On `v2` branch with clean working tree (`git status` shows nothing to commit).
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` all green on the current tip.
- `src/app/examMode.ts` + `applyExamModeFromUrl` are the precedent pattern you are extending — read them before Task 1.

---

## Scope decisions locked in

1. **Moodle bridge is OUT of Phase 7.** It moves to Phase 5 tail so `load`/`save` can call real codecs.
2. **Menu file actions stay `toastPhase5` stubs.** Phase 7 delivers the `platform/fs/` + `platform/imageExport/` primitives; Phase 5 wires the codec → fs glue.
3. **`?readonly` is a first-class UI flag** distinct from `examMode`. `examMode` = lockdown of data-exfiltrating actions (Open/Save/Export/Validation); `readonly` = full read-only enforcement (no drag, no place, no delete, no rename). A session can be in either, both, or neither.
4. **`?embed` hides menu + toolbar chrome.** Legacy default-examMode-on behaviour when `?embed=true` is preserved (it already exists in `resolveExamModeFromSearch`).
5. **Italian translations ship as best-effort.** I know Italian well enough for UI; native review is a follow-up captured in BACKLOG.md, not a Phase 7 gate.
6. **Locale linter = parity + orphan detection.** It diffs EN ↔ IT keys AND scans source for `t('…')` call sites to flag orphan keys + missing keys.

---

## File Structure

```
src/
  app/
    queryParams.ts              (NEW — central parser, pure)
    queryParams.test.ts         (NEW)
    examMode.ts                 (MODIFY — delegate to queryParams)
    bootstrap.ts                (MODIFY — wire readonly subscriber)
  main.tsx                      (MODIFY — apply all query params at boot)
  platform/
    fs/
      openFile.ts               (NEW)
      openFile.test.ts          (NEW)
      downloadBlob.ts           (NEW)
      downloadBlob.test.ts      (NEW)
      index.ts                  (NEW — barrel)
    imageExport/
      toPng.ts                  (NEW)
      toPng.test.ts             (NEW)
      toSvg.ts                  (NEW)
      toSvg.test.ts             (NEW)
      index.ts                  (NEW — barrel)
    i18n/
      locales/it/common.json    (REWRITE — translate)
      locales/it/toolbar.json   (REWRITE — translate)
      locales/it/menu.json      (REWRITE — translate)
      locales/it/properties.json(REWRITE — translate)
      locales/it/modals.json    (REWRITE — translate)
  state/
    uiStore.ts                  (MODIFY — add `readonly: boolean` + `embed: boolean`)
    uiStore.test.ts             (MODIFY — cover new flags)
  interaction/
    actions.ts                  (MODIFY — readonly gate on mutating actions)
    actions.readonly.test.ts    (NEW — focused tests)
  ui/
    toolbar/Toolbar.tsx         (MODIFY — hide mutator tools when readonly)
    toolbar/Toolbar.test.tsx    (MODIFY — cover readonly path)
    menu/Menu.tsx               (MODIFY — hide hamburger under embed)
    app/AppShell.tsx            (MODIFY — hide toolbar under embed)
    properties/PanelHeader.tsx  (MODIFY — hide delete button under readonly)
    properties/*Row.tsx         (MODIFY — inputs read-only under readonly)
    integration.test.tsx        (EXTEND — readonly + embed + lang=it cases)
scripts/
  check-locales.ts              (NEW — key parity + orphan-key linter)
.github/workflows/
  ci.yml                        (MODIFY — add `pnpm lint:locales` step)
package.json                    (MODIFY — `lint:locales` script)
vitest.config.ts                (MODIFY — add coverage threshold for platform/fs + platform/imageExport)
```

---

## Task 1: Query-param parser (`src/app/queryParams.ts`)

**Files:**
- Create: `src/app/queryParams.ts`
- Create: `src/app/queryParams.test.ts`
- Modify: `src/app/examMode.ts` (delegate parsing to queryParams)

Rationale: one place that turns `URLSearchParams` into a typed `QueryParams` record. Every other task depends on this. `examMode.ts` stays the single apply site for exam mode, but now reads the parsed record instead of re-parsing.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/queryParams.test.ts
import { describe, it, expect } from 'vitest'
import { parseQueryParams } from './queryParams'

describe('parseQueryParams', () => {
  it('returns all defaults for an empty query', () => {
    expect(parseQueryParams('')).toEqual({
      lang: null,
      validation: null,
      readonly: false,
      embed: false,
      examMode: false,
    })
  })

  it('parses ?lang=it as "it" and ?lang=xx as null (unknown → null)', () => {
    expect(parseQueryParams('?lang=it').lang).toBe('it')
    expect(parseQueryParams('?lang=en').lang).toBe('en')
    expect(parseQueryParams('?lang=xx').lang).toBeNull()
  })

  it('parses ?validation=on | off, else null', () => {
    expect(parseQueryParams('?validation=on').validation).toBe('on')
    expect(parseQueryParams('?validation=off').validation).toBe('off')
    expect(parseQueryParams('?validation=garbage').validation).toBeNull()
  })

  it('parses ?readonly=true and ?embed=true as booleans', () => {
    expect(parseQueryParams('?readonly=true').readonly).toBe(true)
    expect(parseQueryParams('?readonly=false').readonly).toBe(false)
    expect(parseQueryParams('?embed=true').embed).toBe(true)
  })

  it('?embed=true defaults examMode on; explicit ?examMode=false wins', () => {
    expect(parseQueryParams('?embed=true').examMode).toBe(true)
    expect(parseQueryParams('?embed=true&examMode=false').examMode).toBe(false)
    expect(parseQueryParams('?examMode=true').examMode).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/queryParams.test.ts`
Expected: FAIL with "Cannot find module './queryParams'".

- [ ] **Step 3: Implement the parser**

```ts
// src/app/queryParams.ts
import type { Language } from '@/state/uiStore'

export interface QueryParams {
  readonly lang: Language | null
  readonly validation: 'on' | 'off' | null
  readonly readonly: boolean
  readonly embed: boolean
  readonly examMode: boolean
}

const LANGS = new Set<Language>(['en', 'it'])

const parseLang = (raw: string | null): Language | null =>
  raw && LANGS.has(raw as Language) ? (raw as Language) : null

const parseValidation = (raw: string | null): 'on' | 'off' | null =>
  raw === 'on' || raw === 'off' ? raw : null

const parseBool = (raw: string | null): boolean => raw === 'true'

const resolveExamMode = (p: URLSearchParams): boolean => {
  const raw = p.get('examMode')
  if (raw === 'true') return true
  if (raw === 'false') return false
  return p.get('embed') === 'true'
}

export const parseQueryParams = (search: string): QueryParams => {
  const p = new URLSearchParams(search)
  return {
    lang: parseLang(p.get('lang')),
    validation: parseValidation(p.get('validation')),
    readonly: parseBool(p.get('readonly')),
    embed: parseBool(p.get('embed')),
    examMode: resolveExamMode(p),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/queryParams.test.ts`
Expected: PASS — all 5 cases green.

- [ ] **Step 5: Delegate examMode.ts to the new parser**

```ts
// src/app/examMode.ts (REPLACE resolveExamModeFromSearch body)
import { useUiStore } from '@/state/uiStore'
import { parseQueryParams } from './queryParams'

export const resolveExamModeFromSearch = (search: string): boolean =>
  parseQueryParams(search).examMode

export const applyExamModeFromUrl = (): void => {
  if (typeof window === 'undefined') return
  useUiStore.getState().setExamMode(resolveExamModeFromSearch(window.location.search))
}
```

Run: `pnpm test src/app/examMode.test.ts` — existing 4 tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/queryParams.ts src/app/queryParams.test.ts src/app/examMode.ts
git commit -m "feat(app): central query-param parser; examMode delegates to it"
```

---

## Task 2: `platform/fs/` — open file + download blob

**Files:**
- Create: `src/platform/fs/openFile.ts`
- Create: `src/platform/fs/openFile.test.ts`
- Create: `src/platform/fs/downloadBlob.ts`
- Create: `src/platform/fs/downloadBlob.test.ts`
- Create: `src/platform/fs/index.ts`

Rationale: the two DOM-only primitives Phase 5 will call through to. Both are tiny, pure platform wrappers, but they encapsulate the dirty DOM details (invisible `<input>`, synthetic click, blob URL lifecycle) so consumers get a clean async API.

- [ ] **Step 1: Write `openFile` test**

```ts
// src/platform/fs/openFile.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { openFile } from './openFile'

afterEach(() => { vi.restoreAllMocks() })

describe('openFile', () => {
  it('resolves with the File when the invisible input reports change', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

    // Intercept the input the helper creates so we can drive its `change` event.
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag) as HTMLElement
      if (tag === 'input') {
        queueMicrotask(() => {
          Object.defineProperty(el, 'files', { value: [file], configurable: true })
          el.dispatchEvent(new Event('change'))
        })
      }
      return el as never
    })

    await expect(openFile({ accept: '.txt' })).resolves.toStrictEqual(file)
  })

  it('resolves with null when the user cancels (no files)', async () => {
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag) as HTMLElement
      if (tag === 'input') {
        queueMicrotask(() => {
          Object.defineProperty(el, 'files', { value: [], configurable: true })
          el.dispatchEvent(new Event('change'))
        })
      }
      return el as never
    })

    await expect(openFile({ accept: '.txt' })).resolves.toBeNull()
  })
})
```

- [ ] **Step 2: Run it to confirm failure** — `pnpm test src/platform/fs/openFile.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `openFile.ts`**

```ts
// src/platform/fs/openFile.ts
export interface OpenFileOptions {
  /** MIME or extension list, e.g. ".json,.xml" or "image/png". */
  readonly accept: string
  /** Allow multiple files. Default false. */
  readonly multiple?: boolean
}

/**
 * Pops the native file-picker by synthesising a click on an invisible
 * `<input type=file>`. Resolves with the chosen File (or null if the user
 * cancelled / closed the picker without choosing anything).
 *
 * For `multiple: true` the single-file overload is unchanged; callers that
 * want multi-file selection use `openFiles` (not shipped in Phase 7).
 */
export const openFile = ({ accept, multiple = false }: OpenFileOptions): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'

    input.addEventListener('change', () => {
      const file = input.files && input.files.length > 0 ? input.files[0]! : null
      resolve(file)
    }, { once: true })

    // Some browsers require the input to be in the DOM before `click` works.
    document.body.appendChild(input)
    try {
      input.click()
    } finally {
      // Defer removal so the change event has time to fire.
      queueMicrotask(() => input.remove())
    }
  })
```

- [ ] **Step 4: Tests pass** — `pnpm test src/platform/fs/openFile.test.ts` → 2/2 PASS.

- [ ] **Step 5: Write `downloadBlob` test**

```ts
// src/platform/fs/downloadBlob.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { downloadBlob } from './downloadBlob'

afterEach(() => { vi.restoreAllMocks() })

describe('downloadBlob', () => {
  it('creates a blob URL, clicks an anchor with the filename, and revokes the URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

    const clicks: HTMLAnchorElement[] = []
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag) as HTMLElement
      if (tag === 'a') {
        const anchor = el as HTMLAnchorElement
        anchor.click = () => { clicks.push(anchor) }
      }
      return el as never
    })

    downloadBlob(new Blob(['payload'], { type: 'application/json' }), 'diagram.json')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clicks).toHaveLength(1)
    expect(clicks[0]!.download).toBe('diagram.json')
    expect(clicks[0]!.href).toBe('blob:mock-url')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
```

- [ ] **Step 6: Run → fail → implement → pass**

```ts
// src/platform/fs/downloadBlob.ts
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  try {
    a.click()
  } finally {
    a.remove()
    URL.revokeObjectURL(url)
  }
}
```

Run `pnpm test src/platform/fs/downloadBlob.test.ts` → PASS.

- [ ] **Step 7: Create `index.ts` barrel**

```ts
// src/platform/fs/index.ts
export { openFile, type OpenFileOptions } from './openFile'
export { downloadBlob } from './downloadBlob'
```

- [ ] **Step 8: Commit**

```bash
git add src/platform/fs
git commit -m "feat(platform): fs primitives — openFile + downloadBlob"
```

---

## Task 3: `platform/imageExport/toPng`

**Files:**
- Create: `src/platform/imageExport/toPng.ts`
- Create: `src/platform/imageExport/toPng.test.ts`

Rationale: wraps React Flow's `toPng` utility with a sensible default (4 px padding, canvas-bg fill, native pixel density). Kept as an async function returning a data URL + width/height so callers can either render preview or pipe to `downloadBlob`.

- [ ] **Step 1: Failing test**

```ts
// src/platform/imageExport/toPng.test.ts
import { describe, it, expect, vi } from 'vitest'
import { toPng } from './toPng'

// React Flow's utility is the only collaborator — mock it directly.
vi.mock('@xyflow/react', async () => ({
  // `toPng` is a top-level named export on the utils subpath; we mirror it.
  toPng: vi.fn(async () => 'data:image/png;base64,MOCK'),
}))

describe('toPng', () => {
  it('returns the data URL produced by @xyflow/react.toPng', async () => {
    const el = document.createElement('div')
    await expect(toPng(el)).resolves.toBe('data:image/png;base64,MOCK')
  })

  it('passes backgroundColor + pixelRatio options through', async () => {
    const { toPng: mockRfToPng } = (await import('@xyflow/react')) as unknown as {
      toPng: ReturnType<typeof vi.fn>
    }
    const el = document.createElement('div')

    await toPng(el, { backgroundColor: '#112233', pixelRatio: 2 })

    expect(mockRfToPng).toHaveBeenCalledWith(el, expect.objectContaining({
      backgroundColor: '#112233',
      pixelRatio: 2,
    }))
  })
})
```

- [ ] **Step 2: Run → fail** — `pnpm test src/platform/imageExport/toPng.test.ts`.

- [ ] **Step 3: Implement**

```ts
// src/platform/imageExport/toPng.ts
import { toPng as rfToPng } from '@xyflow/react'

export interface ToPngOptions {
  /** CSS colour painted behind the canvas. Default: 'white'. */
  readonly backgroundColor?: string
  /** Pixel density multiplier. Default: window.devicePixelRatio or 1. */
  readonly pixelRatio?: number
}

export const toPng = (el: HTMLElement, opts: ToPngOptions = {}): Promise<string> =>
  rfToPng(el, {
    backgroundColor: opts.backgroundColor ?? 'white',
    pixelRatio: opts.pixelRatio ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1),
    // Include everything currently in the DOM — no filter hooks in v1.
  })
```

Run → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/platform/imageExport/toPng.ts src/platform/imageExport/toPng.test.ts
git commit -m "feat(platform): imageExport — toPng wraps @xyflow/react.toPng"
```

---

## Task 4: `platform/imageExport/toSvg` + barrel

**Files:**
- Create: `src/platform/imageExport/toSvg.ts`
- Create: `src/platform/imageExport/toSvg.test.ts`
- Create: `src/platform/imageExport/index.ts`

Rationale: SVG export is structurally different from PNG — we serialise the live `<svg>` DOM rather than rasterising. Pure string output; `downloadBlob` handles the file side.

- [ ] **Step 1: Failing test**

```ts
// src/platform/imageExport/toSvg.test.ts
import { describe, it, expect } from 'vitest'
import { toSvg } from './toSvg'

describe('toSvg', () => {
  it('returns the XML declaration + serialised SVG', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 10 10')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', '10')
    rect.setAttribute('height', '10')
    svg.appendChild(rect)

    const out = toSvg(svg)
    expect(out.startsWith('<?xml version="1.0"')).toBe(true)
    expect(out).toContain('viewBox="0 0 10 10"')
    expect(out).toContain('<rect')
  })

  it('injects the xmlns attribute if missing', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const out = toSvg(svg)
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement**

```ts
// src/platform/imageExport/toSvg.ts
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
const SVG_NS = 'http://www.w3.org/2000/svg'

export const toSvg = (svg: SVGElement): string => {
  // Clone so we can mutate (adding xmlns) without touching the live DOM.
  const clone = svg.cloneNode(true) as SVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', SVG_NS)
  return XML_DECL + new XMLSerializer().serializeToString(clone)
}
```

- [ ] **Step 4: Barrel**

```ts
// src/platform/imageExport/index.ts
export { toPng, type ToPngOptions } from './toPng'
export { toSvg } from './toSvg'
```

- [ ] **Step 5: Commit**

```bash
git add src/platform/imageExport
git commit -m "feat(platform): imageExport — toSvg serialises SVG DOM"
```

---

## Task 5: `?lang` query-param wiring

**Files:**
- Create: `src/app/applyLanguage.ts`
- Create: `src/app/applyLanguage.test.ts`
- Modify: `src/main.tsx` (wire it before `initI18n`)
- Modify: `src/app/bootstrap.ts` (subscribe `uiStore.language → i18next.changeLanguage`)

Rationale: two rules — URL wins on first load (writes to `uiStore.language`), after that the store is source-of-truth and a subscriber keeps i18next in sync. Separating apply (one-shot) from subscribe (lifetime) mirrors the theme pattern.

- [ ] **Step 1: Failing test**

```ts
// src/app/applyLanguage.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { applyLanguageFromUrl } from './applyLanguage'
import { useUiStore } from '@/state/uiStore'

beforeEach(() => { useUiStore.setState({ language: 'en' }) })

describe('applyLanguageFromUrl', () => {
  it('writes ?lang=it to uiStore.language', () => {
    applyLanguageFromUrl('?lang=it')
    expect(useUiStore.getState().language).toBe('it')
  })

  it('leaves uiStore.language alone when ?lang is absent', () => {
    useUiStore.setState({ language: 'it' })
    applyLanguageFromUrl('')
    expect(useUiStore.getState().language).toBe('it')
  })

  it('leaves uiStore.language alone when ?lang is unknown', () => {
    applyLanguageFromUrl('?lang=xx')
    expect(useUiStore.getState().language).toBe('en')
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement**

```ts
// src/app/applyLanguage.ts
import { useUiStore } from '@/state/uiStore'
import { parseQueryParams } from './queryParams'

export const applyLanguageFromUrl = (search: string): void => {
  const { lang } = parseQueryParams(search)
  if (lang === null) return
  useUiStore.getState().setLanguage(lang)
}
```

Tests pass.

- [ ] **Step 4: Subscribe i18next to store changes**

```ts
// src/app/bootstrap.ts — inside installSubscribers(), add:
import i18next from 'i18next'

useUiStore.subscribe(
  (s) => s.language,
  (lang) => {
    if (i18next.isInitialized && i18next.language !== lang) {
      void i18next.changeLanguage(lang)
    }
  },
  { fireImmediately: true },
)
```

- [ ] **Step 5: Wire into `main.tsx`**

```ts
// src/main.tsx (add between applyExamModeFromUrl() and initI18n())
import { applyLanguageFromUrl } from '@/app/applyLanguage'
// ...
applyLanguageFromUrl(window.location.search)
```

Then change `initI18n` call to pick the applied language:

```ts
// src/platform/i18n/init.ts — replace hard-coded `lng: 'en'` with
//   lng: useUiStore.getState().language,
```

Add an import:

```ts
import { useUiStore } from '@/state/uiStore'
```

- [ ] **Step 6: Verify end-to-end**

Run: `pnpm test`
Expected: green — existing tests still pass, 3 new `applyLanguage` tests pass.
Run: `pnpm dev` and visit `http://localhost:5173/?lang=it`. Menu/toolbar/property panel render in Italian (assuming Italian bundles — Task 11 — or fall back to EN for now).

- [ ] **Step 7: Commit**

```bash
git add src/app/applyLanguage.ts src/app/applyLanguage.test.ts src/app/bootstrap.ts \
       src/platform/i18n/init.ts src/main.tsx
git commit -m "feat(app): ?lang= writes uiStore.language; i18next syncs via subscriber"
```

---

## Task 6: `?validation` query-param wiring

**Files:**
- Create: `src/app/applyValidation.ts`
- Create: `src/app/applyValidation.test.ts`
- Modify: `src/main.tsx`

Rationale: spec §9.11 says `?validation=on|off` overrides the persisted toggle for this session. Apply once at boot — the existing `validationStore` subscriber in `bootstrap.ts` already re-runs validation when `enabled` flips.

- [ ] **Step 1: Failing test**

```ts
// src/app/applyValidation.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { applyValidationFromUrl } from './applyValidation'
import { useValidationStore } from '@/state/validationStore'

beforeEach(() => { useValidationStore.setState({ enabled: true }) })

describe('applyValidationFromUrl', () => {
  it('?validation=off disables validation for the session', () => {
    applyValidationFromUrl('?validation=off')
    expect(useValidationStore.getState().enabled).toBe(false)
  })

  it('?validation=on re-enables validation', () => {
    useValidationStore.setState({ enabled: false })
    applyValidationFromUrl('?validation=on')
    expect(useValidationStore.getState().enabled).toBe(true)
  })

  it('absent param leaves enabled untouched', () => {
    useValidationStore.setState({ enabled: false })
    applyValidationFromUrl('')
    expect(useValidationStore.getState().enabled).toBe(false)
  })
})
```

- [ ] **Step 2: Implement**

```ts
// src/app/applyValidation.ts
import { useValidationStore } from '@/state/validationStore'
import { parseQueryParams } from './queryParams'

export const applyValidationFromUrl = (search: string): void => {
  const { validation } = parseQueryParams(search)
  if (validation === null) return
  useValidationStore.getState().setEnabled(validation === 'on')
}
```

- [ ] **Step 3: Wire**

```ts
// src/main.tsx
import { applyValidationFromUrl } from '@/app/applyValidation'
// ...
applyValidationFromUrl(window.location.search)
```

Run `pnpm test`. Green.

- [ ] **Step 4: Commit**

```bash
git add src/app/applyValidation.ts src/app/applyValidation.test.ts src/main.tsx
git commit -m "feat(app): ?validation=on|off overrides validationStore.enabled at boot"
```

---

## Task 7: `uiStore.readonly` + `uiStore.embed` flags + apply

**Files:**
- Modify: `src/state/uiStore.ts`
- Modify: `src/state/uiStore.test.ts`
- Create: `src/app/applyMode.ts` (joins readonly + embed from the parser to the store)
- Create: `src/app/applyMode.test.ts`
- Modify: `src/main.tsx`

Rationale: two transient URL-driven flags, same pattern as `examMode`. Not persisted. `embed` is a UI-chrome hint; `readonly` is a mutation lockdown.

- [ ] **Step 1: Extend `uiStore`**

```ts
// src/state/uiStore.ts — add inside UiStoreState
readonly readonly: boolean
readonly embed: boolean
setReadonly: (on: boolean) => void
setEmbed: (on: boolean) => void
```

Defaults: `readonly: false, embed: false`. Actions set the field via immer. Neither is persisted.

- [ ] **Step 2: Test they round-trip**

```ts
// src/state/uiStore.test.ts — add
it('setReadonly + setEmbed mutate only their own fields', () => {
  useUiStore.setState({ readonly: false, embed: false })
  useUiStore.getState().setReadonly(true)
  useUiStore.getState().setEmbed(true)
  expect(useUiStore.getState().readonly).toBe(true)
  expect(useUiStore.getState().embed).toBe(true)
})
```

- [ ] **Step 3: Apply helper**

```ts
// src/app/applyMode.ts
import { useUiStore } from '@/state/uiStore'
import { parseQueryParams } from './queryParams'

export const applyModeFromUrl = (search: string): void => {
  const { readonly, embed } = parseQueryParams(search)
  const store = useUiStore.getState()
  store.setReadonly(readonly)
  store.setEmbed(embed)
}
```

Test parallels Task 5:

```ts
// src/app/applyMode.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { applyModeFromUrl } from './applyMode'
import { useUiStore } from '@/state/uiStore'

beforeEach(() => { useUiStore.setState({ readonly: false, embed: false }) })

describe('applyModeFromUrl', () => {
  it('applies ?readonly=true and ?embed=true', () => {
    applyModeFromUrl('?readonly=true&embed=true')
    const s = useUiStore.getState()
    expect(s.readonly).toBe(true)
    expect(s.embed).toBe(true)
  })

  it('clears both flags on an empty query (URL is source of truth)', () => {
    useUiStore.setState({ readonly: true, embed: true })
    applyModeFromUrl('')
    const s = useUiStore.getState()
    expect(s.readonly).toBe(false)
    expect(s.embed).toBe(false)
  })
})
```

- [ ] **Step 4: Wire into main.tsx**

```ts
// src/main.tsx
import { applyModeFromUrl } from '@/app/applyMode'
// ...
applyModeFromUrl(window.location.search)
```

- [ ] **Step 5: Commit**

```bash
git add src/state/uiStore.ts src/state/uiStore.test.ts src/app/applyMode.ts \
       src/app/applyMode.test.ts src/main.tsx
git commit -m "feat(state,app): readonly + embed flags driven by ?readonly / ?embed"
```

---

## Task 8: Readonly enforcement — action layer

**Files:**
- Modify: `src/interaction/actions.ts`
- Create: `src/interaction/actions.readonly.test.ts`

Rationale: the honest lockdown. Actions early-return when `uiStore.readonly === true`. Selection and viewport actions remain live. Delete, place, connect, move, resize, nudge, paste, cut, duplicate — all gated. One tiny helper + a call at the top of each mutating action keeps the diff readable.

Exact list to gate (names verified against `src/interaction/actions.ts`):

- `placeNode`
- `moveDraggedNode`
- `nudgeSelection`
- `undoAction`, `redoAction`
- `stubCut`, `stubPaste` (Phase 3 stubs; still want the lockdown today so Phase 5 inherits it)
- `deleteSelectionAction`
- `duplicateSelectionAction`
- `connectNodes`
- `connectChildToIsaAction`
- `placeAttributeOnParent`
- `beginRenameSelected`

`stubCopy` is NOT gated (read-only by design). Selection actions (`selectNodeFromEvent`, `selectEdgeFromEvent`, `beginRubberband`, `updateRubberbandAction`, `commitRubberbandAction`, `selectAllAction`, `clearSelectionAction`), viewport actions (`panViewportAction`, `zoomAtPointAction`, `zoomInAction`, `zoomOutAction`, `fitAction`), flow toasts, and `toggleCheatsheetAction` all remain live.

- [ ] **Step 1: Failing test**

```ts
// src/interaction/actions.readonly.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { placeNode, nudgeSelection, deleteSelectionAction } from './actions'
import { initialContext } from './context'
import { NO_MODIFIERS } from './events'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram, type NodeId } from '@/domain/types'

beforeEach(() => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useUiStore.setState({ readonly: false })
})

const seedEntityAndSelect = (): NodeId => {
  const id = useDiagramStore.getState().addNode({
    kind: 'entity', name: 'E', isWeak: false,
    position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  })
  useSelectionStore.setState({ selectedNodeIds: new Set([id]) })
  return id
}

describe('actions — readonly gate', () => {
  it('placeNode does nothing when readonly is true', () => {
    useUiStore.setState({ readonly: true })
    placeNode(
      { ...initialContext, tool: 'entity' },
      { type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
  })

  it('deleteSelectionAction leaves the selected node alive when readonly is true', () => {
    const id = seedEntityAndSelect()
    useUiStore.setState({ readonly: true })

    deleteSelectionAction(initialContext, { type: 'DELETE' })

    expect(useDiagramStore.getState().diagram.nodeOrder).toContain(id)
  })

  it('nudgeSelection does not move the selected node when readonly is true', () => {
    const id = seedEntityAndSelect()
    useUiStore.setState({ readonly: true })

    nudgeSelection(initialContext, { type: 'NUDGE', dx: 10, dy: 10 })

    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 0, y: 0 })
  })

  it('with readonly false, placeNode still works (sanity — gate is scoped)', () => {
    placeNode(
      { ...initialContext, tool: 'entity' },
      { type: 'CANVAS_POINTER_DOWN', point: { x: 50, y: 50 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run → fail** on the "does nothing" line (placeNode still places).

- [ ] **Step 3: Add gate helper and wire it**

```ts
// src/interaction/actions.ts — near top of file
import { useUiStore } from '@/state/uiStore'

const isReadonly = (): boolean => useUiStore.getState().readonly
```

Then at the top of every action in the gate list above (placeNode, moveDraggedNode, nudgeSelection, undoAction, redoAction, stubCut, stubPaste, deleteSelectionAction, duplicateSelectionAction, connectNodes, connectChildToIsaAction, placeAttributeOnParent, beginRenameSelected):

```ts
if (isReadonly()) return
```

- [ ] **Step 4: Tests pass.** Run `pnpm test src/interaction/actions` — the readonly-gate tests pass; the existing actions tests stay green because they don't set `uiStore.readonly = true`.

- [ ] **Step 5: Commit**

```bash
git add src/interaction/actions.ts src/interaction/actions.readonly.test.ts
git commit -m "feat(interaction): readonly gate early-returns every mutating action"
```

---

## Task 9: Readonly enforcement — UI surfaces

**Files:**
- Modify: `src/ui/toolbar/Toolbar.tsx` (hide mutator tools; select + pan remain)
- Modify: `src/ui/toolbar/Toolbar.test.tsx` (add readonly path)
- Modify: `src/ui/properties/PanelHeader.tsx` (hide Delete button)
- Modify: `src/ui/properties/AttributeRow.tsx` (disable chip toggles + name input)
- Modify: `src/ui/properties/RelationshipLegRow.tsx` (disable cardinality / participation / role inputs)
- Modify: `src/ui/menu/Menu.tsx` (hide destructive `Reset` row; file actions already hidden under examMode which readonly users usually also have, but gate independently)

Rationale: mirrors the examMode pattern — hide rather than disable. Readonly users can still see the diagram, select nodes, zoom, read the property panel; they just can't mutate anything.

- [ ] **Step 1: Toolbar — hide mutator tools**

```tsx
// src/ui/toolbar/Toolbar.tsx — inside the group map
import { useUiStore } from '@/state/uiStore'
// ...
const readonly = useUiStore((s) => s.readonly)

const SELECT_ONLY = new Set(['select', 'pan'])

const groups = chenPlugin.tools.groups.map((g) => ({
  ...g,
  tools: readonly ? g.tools.filter((id) => SELECT_ONLY.has(id)) : g.tools,
})).filter((g) => g.tools.length > 0)
```

Also: the history group (undo/redo) stays rendered but its buttons disable when `readonly` — they're a confirmation of lockdown, not a lockdown bypass. `<IconButton disabled={readonly}>` is fine here because the underlying actions are already gated at Task 8.

Similarly the "delete-when-selected" trash button hides when readonly.

- [ ] **Step 2: Test**

```tsx
// src/ui/toolbar/Toolbar.test.tsx — add
it('hides mutator tools when uiStore.readonly is true', () => {
  useUiStore.setState({ readonly: true })
  render(<Toolbar />)
  expect(screen.queryByRole('button', { name: /entity/i })).toBeNull()
  expect(screen.queryByRole('button', { name: /relationship/i })).toBeNull()
  expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
})
```

- [ ] **Step 3: Property panel — hide delete, disable inputs**

```tsx
// src/ui/properties/PanelHeader.tsx
const readonly = useUiStore((s) => s.readonly)
// ...
{!readonly && <IconButton onClick={onDelete} ... />}
```

Attribute/relationship rows: pass `readonly` to each input/chip, `disabled={readonly}`.

- [ ] **Step 4: Menu — hide Reset under readonly**

`MenuDropdownBody` receives `onReset` / `resetIcon` as required props today, so the clean lockdown is at the Menu.tsx level: make `onReset` a no-op confirm-dialog stub that early-returns when readonly, AND add a `showReset: boolean` prop to `MenuDropdownBody` so the row disappears entirely rather than being silently inert. Both changes together keep the hide-not-disable discipline.

```tsx
// src/ui/menu/MenuDropdownBody.tsx — add to props
readonly showReset: boolean
// ...inside the component JSX, wrap the Reset row:
{showReset && (
  <button onClick={onReset} ...>
    <ResetIcon size={18} aria-hidden />
    <span className="flex-1">{t('menu:app.reset')}</span>
  </button>
)}
```

```tsx
// src/ui/menu/Menu.tsx
const readonly = useUiStore((s) => s.readonly)
// ...
<MenuDropdownBody
  // ...existing props
  showReset={!readonly}
/>
```

Test in `Menu.test.tsx`:

```tsx
it('hides the Reset row under uiStore.readonly', () => {
  useUiStore.setState({ readonly: true })
  render(<Menu />)
  fireEvent.click(screen.getByRole('button', { name: /menu/i }))
  expect(screen.queryByText(/reset|reimposta/i)).toBeNull()
})
```

- [ ] **Step 5: Run full test suite** — `pnpm test`. All green including new readonly-specific tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/toolbar src/ui/properties src/ui/menu
git commit -m "feat(ui): hide mutator surfaces under uiStore.readonly"
```

---

## Task 10: `?embed` chrome hiding

**Files:**
- Modify: `src/ui/app/AppShell.tsx` (conditional menu + toolbar render)
- Modify: `src/ui/app/AppShell.test.tsx`

Rationale: embed means "I'm iframed in Moodle/LMS; show canvas only." Menu and Toolbar are the two floating overlays; both hide when `uiStore.embed === true`. Property panel stays — in embed mode it's often the only interaction surface for students once they've clicked a node. Canvas Background + Controls stay.

- [ ] **Step 1: Failing test**

```tsx
// src/ui/app/AppShell.test.tsx — add
it('hides the Menu hamburger and Toolbar when embed is true', () => {
  useUiStore.setState({ embed: true })
  render(<AppShell />)
  expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
  expect(screen.queryByRole('toolbar')).toBeNull()
})
```

- [ ] **Step 2: Implement**

```tsx
// src/ui/app/AppShell.tsx
const embed = useUiStore((s) => s.embed)
// ...
{!embed && <Menu />}
{!embed && <Toolbar />}
```

- [ ] **Step 3: Tests pass.** Run `pnpm dev` + visit `?embed=true` — canvas only, no floating chrome.

- [ ] **Step 4: Commit**

```bash
git add src/ui/app
git commit -m "feat(ui): ?embed hides Menu + Toolbar; canvas-only chrome"
```

---

## Task 11: Italian translations — 5 bundles

**Files:**
- Modify: `src/platform/i18n/locales/it/common.json`
- Modify: `src/platform/i18n/locales/it/toolbar.json`
- Modify: `src/platform/i18n/locales/it/menu.json`
- Modify: `src/platform/i18n/locales/it/properties.json`
- Modify: `src/platform/i18n/locales/it/modals.json`
- Modify: `docs/superpowers/BACKLOG.md` (add "native Italian review of Phase 7 translations")

Rationale: replace EN-duplicated values with Italian. Structure stays identical — the locale linter (Task 12) will enforce that going forward. Translation follows standard Italian UI conventions: `Apri`, `Salva`, `Esporta`, `Annulla`, `Conferma`, `Elimina`, etc.

- [ ] **Step 1: Translate `common.json`** — typical keys like `close → Chiudi`, `cancel → Annulla`, `confirm → Conferma`, `delete → Elimina`, `save → Salva`, `edit → Modifica`, `rename → Rinomina`, `yes → Sì`, `no → No`.

- [ ] **Step 2: Translate `toolbar.json`** — tool labels: `select → Seleziona`, `pan → Sposta vista`, `entity → Entità`, `relationship → Relazione`, `attribute → Attributo`, `isa → Generalizzazione`, `connect → Connetti`, etc.

- [ ] **Step 3: Translate `menu.json`** — `new → Nuovo diagramma`, `open → Apri…`, `save → Salva`, `exportPng → Esporta PNG`, `exportSvg → Esporta SVG`, `theme → Tema`, `validationOn → Validazione attiva`, `shortcuts → Scorciatoie`, `language → Lingua`, `reset → Reimposta diagramma`.

- [ ] **Step 4: Translate `properties.json`** — `name → Nome`, `weak → Debole`, `identifying → Identificante`, `key → Chiave`, `discriminant → Discriminante`, `multivalued → Multivalore`, `derived → Derivato`, `composite → Composto`, `cardinality → Cardinalità`, `participation → Partecipazione`, `total → Totale`, `partial → Parziale`, `role → Ruolo`, `attributes → Attributi`, `addAttribute → Aggiungi attributo`, `showMore → Mostra altri ({{count}})`, `children → Figli`, `parent → Padre`.

- [ ] **Step 5: Translate `modals.json`** — keyboard cheatsheet headings, error/confirm/toast copy. Keep interpolation placeholders (`{{name}}`, `{{count}}`) exactly as in EN.

- [ ] **Step 6: Remove the deferred `_note` key from `validation.json`** — its premise ("deferred to Phase 7") no longer applies.

- [ ] **Step 7: Run full test suite**

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Expected: green. i18next imports JSON at build time, so stale key types would surface.

Also smoke-test: `pnpm dev` → `?lang=it` → every visible string is Italian.

- [ ] **Step 8: Add BACKLOG entry**

```md
<!-- docs/superpowers/BACKLOG.md -->
- Native-speaker review of Italian UI bundles (Phase 7 delivered best-effort translations, validation bundle excepted).
```

- [ ] **Step 9: Commit**

```bash
git add src/platform/i18n/locales/it
git commit -m "feat(i18n): translate Italian UI bundles (common, toolbar, menu, properties, modals)"
```

```bash
git add docs/superpowers/BACKLOG.md
git commit -m "docs: flag native-speaker review of IT translations"
```

---

## Task 12: Locale linter + CI wiring

**Files:**
- Create: `scripts/check-locales.ts`
- Modify: `package.json` (add `"lint:locales": "tsx scripts/check-locales.ts"`)
- Modify: `.github/workflows/ci.yml` (add a `Lint locales` step)
- Add dev-dep `tsx` if not already present

Rationale: two checks in one script, both fail-fast:

1. **Parity**: every leaf key in EN is present in IT and vice versa.
2. **Orphan keys / missing keys**: collect every `t('ns:path')` / `t('key', { ns: 'ns' })` call site by regex; flag JSON keys never referenced (orphan) and referenced keys not in JSON (missing).

Regex, not TS parsing — scope is tight, ~20 files, ~200 keys total. Perfect accuracy isn't the goal; regression prevention is.

- [ ] **Step 1: Failing test for the script** — run `pnpm lint:locales` expecting a clean EN/IT pair today. We'll test by temporarily adding a key to EN only and confirming the script exits non-zero.

Script skeleton:

```ts
// scripts/check-locales.ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { globSync } from 'glob'

const LOCALES_DIR = 'src/platform/i18n/locales'
const SRC_GLOB = 'src/**/*.{ts,tsx}'

type Json = { [k: string]: Json } | string | number | boolean | null

const flatten = (obj: Json, prefix = ''): string[] => {
  if (typeof obj !== 'object' || obj === null) return [prefix.slice(0, -1)]
  return Object.entries(obj).flatMap(([k, v]) => flatten(v, `${prefix}${k}.`))
}

const loadBundle = (lang: string, ns: string): Json =>
  JSON.parse(readFileSync(join(LOCALES_DIR, lang, `${ns}.json`), 'utf8'))

const listNamespaces = (lang: string): string[] =>
  readdirSync(join(LOCALES_DIR, lang))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))

const T_CALL = /\bt\(\s*['"]([^'"]+?)['"](?:\s*,\s*\{[^}]*ns:\s*['"]([^'"]+?)['"][^}]*\})?/g

const collectCallSites = (): Set<string> => {
  const keys = new Set<string>()
  for (const file of globSync(SRC_GLOB, { ignore: ['**/*.test.*', 'src/legacy/**'] })) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(T_CALL)) {
      const raw = m[1]!
      const nsFromOpt = m[2]
      if (raw.includes(':')) keys.add(raw)
      else if (nsFromOpt) keys.add(`${nsFromOpt}:${raw}`)
      else keys.add(`common:${raw}`)
    }
  }
  return keys
}

const problems: string[] = []

// Step 1: parity
const namespaces = listNamespaces('en')
for (const ns of namespaces) {
  const en = new Set(flatten(loadBundle('en', ns)))
  const it = new Set(flatten(loadBundle('it', ns)))
  for (const k of en) if (!it.has(k)) problems.push(`IT missing key: ${ns}:${k}`)
  for (const k of it) if (!en.has(k)) problems.push(`EN missing key: ${ns}:${k}`)
}

// Step 2: orphans + unresolved
const bundleKeys = new Set<string>()
for (const ns of namespaces) {
  for (const k of flatten(loadBundle('en', ns))) bundleKeys.add(`${ns}:${k}`)
}
const calls = collectCallSites()
for (const c of calls) if (!bundleKeys.has(c)) problems.push(`Unresolved t() call: ${c}`)
// Orphan-key detection is a warning, not an error (interpolated keys are dynamic).
const orphans = [...bundleKeys].filter((k) => !calls.has(k))

console.log(`Locale linter: ${namespaces.length} namespaces, ${bundleKeys.size} keys, ${calls.size} call sites.`)
if (orphans.length > 0) console.warn(`Warning: ${orphans.length} orphan key(s) — sample: ${orphans.slice(0, 5).join(', ')}`)

if (problems.length > 0) {
  for (const p of problems) console.error(p)
  process.exit(1)
}
process.exit(0)
```

- [ ] **Step 2: Add `tsx` + `glob` if missing**

```bash
pnpm add -D tsx glob @types/glob
```

- [ ] **Step 3: Add package script**

```json
// package.json
"lint:locales": "tsx scripts/check-locales.ts"
```

- [ ] **Step 4: Run once**

```bash
pnpm lint:locales
```

Expected: exits 0, maybe reports orphan warnings (keys that the UI interpolates dynamically).

- [ ] **Step 5: Wire into CI**

```yaml
# .github/workflows/ci.yml — add after `Lint`, before `Typecheck`
- name: Lint locales
  run: pnpm lint:locales
```

- [ ] **Step 6: Commit**

```bash
git add scripts/check-locales.ts package.json pnpm-lock.yaml .github/workflows/ci.yml
git commit -m "feat(ci): locale linter — EN/IT parity + orphan/missing t() call detection"
```

---

## Task 13: Phase 7 integration test + vitest coverage thresholds + changelog

**Files:**
- Modify: `src/ui/integration.test.tsx` (add Phase 7 scenario)
- Modify: `vitest.config.ts` (add thresholds for `src/platform/fs/**` and `src/platform/imageExport/**`)
- Create or modify: `CHANGELOG.md` (add a Phase 7 entry)

Rationale: one integration test asserts the four Phase 7 query params cooperate — `?lang=it&readonly=true&embed=true&validation=off`. Then we add coverage gates so the new platform dirs can't slip silently.

- [ ] **Step 1: Integration test**

```tsx
// src/ui/integration.test.tsx — append
describe('Phase 7 — URL-driven session', () => {
  it('?lang=it&readonly=true&embed=true disables chrome, hides mutator tools, and renders Italian', async () => {
    // Reset stores + apply URL at the test boundary (NOT the real main.tsx
    // bootstrap — the harness wires the same three calls by hand).
    applyLanguageFromUrl('?lang=it&readonly=true&embed=true&validation=off')
    applyModeFromUrl('?lang=it&readonly=true&embed=true&validation=off')
    applyValidationFromUrl('?lang=it&readonly=true&embed=true&validation=off')
    await i18next.changeLanguage('it')

    render(<AppShell />)

    // Chrome hidden (embed).
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull()
    expect(screen.queryByRole('toolbar')).toBeNull()

    // Validation disabled.
    expect(useValidationStore.getState().enabled).toBe(false)

    // Italian strings appear where the canvas remains interactive (e.g.,
    // React Flow Controls aria labels stay EN — they're not ours — but the
    // property panel "Select an element" empty state is ours.)
    expect(screen.getByText(/Seleziona|Nessun elemento|elemento/i)).toBeInTheDocument()
  })
})
```

Keep the test honest about what it's asserting — if the property panel's empty state isn't the right check, pick a stable Italian string that renders in this config.

- [ ] **Step 2: Coverage thresholds**

```ts
// vitest.config.ts — add under thresholds:
'src/platform/fs/**': { statements: 85, branches: 70, functions: 85, lines: 85 },
'src/platform/imageExport/**': { statements: 85, branches: 70, functions: 85, lines: 85 },
'src/app/**': { statements: 85, branches: 80, functions: 85, lines: 85 }, // already present; confirm still true with new apply*.ts files
```

Run `pnpm test:coverage` and confirm the new dirs clear the bar.

- [ ] **Step 3: CHANGELOG**

```md
# Phase 7 — Platform + i18n (2026-04-24)

### Added
- `platform/fs/`: `openFile`, `downloadBlob` primitives.
- `platform/imageExport/`: `toPng`, `toSvg` primitives.
- Query params: `?lang=en|it`, `?validation=on|off`, `?readonly=true`, `?embed=true`.
- Italian UI bundles (common, toolbar, menu, properties, modals).
- Locale-key linter (`pnpm lint:locales`) in CI — EN/IT parity + orphan/unresolved `t()` detection.

### Deferred
- Moodle postMessage bridge moved to the tail of Phase 5 (needs codec payloads).
- Native-speaker review of Italian strings tracked in BACKLOG.md.
```

- [ ] **Step 4: Full green**

```bash
pnpm lint
pnpm lint:locales
pnpm typecheck
pnpm test
pnpm build
```

All four must be green. No warnings from the locale linter.

- [ ] **Step 5: Commit**

```bash
git add src/ui/integration.test.tsx vitest.config.ts CHANGELOG.md
git commit -m "test(phase7): integration test for ?lang/readonly/embed/validation combo; coverage thresholds"
```

---

## Exit criteria (spec §10.9)

All of:

- `platform/fs/openFile` + `downloadBlob` land with tests.
- `platform/imageExport/toPng` + `toSvg` land with tests.
- `?lang`, `?validation`, `?readonly`, `?embed` wire through at boot and UI surfaces.
- Italian bundles translated (best-effort; `_note` removed).
- Locale linter runs in CI and is green today.
- Integration test for combined URL-driven session passes.
- `pnpm lint`, `pnpm lint:locales`, `pnpm typecheck`, `pnpm test`, `pnpm build` all green.
- `src/ui/ERCanvas.tsx` still works end-to-end in dev.

Explicit **non-exits** (deferred to Phase 5 tail):

- `platform/moodle/bridge.ts`
- Wiring Menu's Open/Save/Export to codecs

---

## Self-review checklist (controller runs before handoff)

1. **Spec coverage**: every bullet in §10.9 mapped to a task or explicitly deferred with reason? ✅ (Moodle deferred with reason; rest mapped Tasks 1–12.)
2. **Placeholder scan**: zero TBDs, zero "similar to Task N", every code step has actual code. ✅
3. **Type consistency**: `Language` from `uiStore.ts` (`'en' | 'it'`) matches `QueryParams.lang` and `applyLanguageFromUrl`. ✅
4. **Order of commits**: each task leaves the tree green. Readonly UI (Task 9) depends on readonly-aware actions (Task 8) which depend on `uiStore.readonly` (Task 7). Linter (Task 12) depends on translations (Task 11) being parity-clean. Order in this plan matches that dependency graph. ✅
