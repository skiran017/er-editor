# Phase 0 — Archive & Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archive the current v1 codebase to `src/legacy/`, scaffold the new `src/` skeleton, swap Konva for React Flow, add the test tooling (Vitest + Playwright), enforce layer-boundary ESLint rules, set up CI, and boot the app to a blank React Flow canvas.

**Architecture:** Stepwise migration on the `v2` branch. Each step is small, committed, and keeps the repo in a known state. No code from v1 is deleted yet — `legacy/` stays as reference until the v2 rewrite reaches parity (Phase 8). ESLint blocks imports from `legacy/` so the new tree cannot accidentally depend on it. `tsconfig.app.json` excludes `legacy/` from the build so the new app can remove Konva cleanly.

**Tech Stack:** React 19 + TypeScript + Vite 7 + Tailwind v4 + `@xyflow/react` 12 + `xstate` 5 + Zustand 5 + Immer 10 + Zundo 2 + Vitest 3 + Playwright 1.x (resolves current) + pnpm. ESLint 9 flat config.

**Reference spec:** [docs/superpowers/specs/2026-04-22-target-architecture-design.md](../specs/2026-04-22-target-architecture-design.md) — the authoritative design doc. When this plan and the spec conflict, the spec wins.

---

## Preconditions

Before starting Task 1, verify:

- [ ] **Check 1: On `v2` branch with clean working tree**

Run:
```bash
git status && git branch --show-current
```
Expected: `nothing to commit, working tree clean` and `v2`.

- [ ] **Check 2: Node 20+ and pnpm installed**

Run:
```bash
node --version && pnpm --version
```
Expected: Node ≥ v20, any recent pnpm.

- [ ] **Check 3: Current app builds before we start**

Run:
```bash
pnpm install && pnpm build
```
Expected: build succeeds (so we have a baseline; if it's already broken, fix before touching anything else).

---

## File Structure

End-state of Phase 0 (files created or modified):

**Moved (archived):**
- `src/App.tsx` → `src/legacy/App.tsx`
- `src/main.tsx` → `src/legacy/main.tsx`
- `src/index.css` → `src/legacy/index.css`
- `src/assets/` → `src/legacy/assets/`
- `src/components/` → `src/legacy/components/`
- `src/lib/` → `src/legacy/lib/`
- `src/store/` → `src/legacy/store/`
- `src/types/` → `src/legacy/types/`

**Created (new v2 skeleton):**
- `src/main.tsx` — new entry (named-export `App`, React 19 createRoot)
- `src/App.tsx` — new app shell, renders `<ERCanvas />`
- `src/index.css` — Tailwind + design tokens (ported from legacy `index.css`, sans Konva-specific rules)
- `src/canvas/ERCanvas.tsx` — minimal React Flow stage (empty nodes/edges)
- `src/canvas/ERCanvas.test.tsx` — Vitest smoke test
- `src/app/.gitkeep`
- `src/domain/.gitkeep`
- `src/state/.gitkeep`
- `src/interaction/.gitkeep`
- `src/notation/chen/.gitkeep`
- `src/platform/.gitkeep`
- `src/ui/.gitkeep`
- `src/canvas/hooks/.gitkeep`
- `src/canvas/adapters/.gitkeep`
- `tests/fixtures/.gitkeep`
- `tests/e2e/smoke.spec.ts`
- `tests/setup.ts` (Vitest setup: `@testing-library/jest-dom`)
- `vitest.config.ts`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`

**Modified:**
- `package.json` (deps + scripts)
- `pnpm-lock.yaml` (regenerated)
- `eslint.config.js` (file-size warning + no-default-export + layer boundaries + ignore `legacy/`)
- `tsconfig.app.json` (exclude `legacy/`)

---

## Task 1: Archive `src/*` to `src/legacy/`

**Files:**
- Move all current `src/` contents into `src/legacy/` preserving git history.

- [ ] **Step 1.1: Create `src/legacy/` directory**

Run:
```bash
mkdir -p src/legacy
```

- [ ] **Step 1.2: Move all current `src/` items into `src/legacy/`**

Run (single `git mv` preserves history for each):
```bash
git mv src/App.tsx src/main.tsx src/index.css src/assets src/components src/lib src/store src/types src/legacy/
```
Expected: eight rename records in `git status`. Run `git status` to verify:
```bash
git status
```
Each item should show `renamed: src/X -> src/legacy/X`.

- [ ] **Step 1.3: Verify `src/` now contains only `legacy/`**

Run:
```bash
ls src/
```
Expected output: a single line `legacy`.

- [ ] **Step 1.4: Verify git preserved file history for a sanity-check file**

Run:
```bash
git log --follow --oneline -n 3 src/legacy/App.tsx
```
Expected: at least 2–3 prior commits predating this rename (history preserved).

- [ ] **Step 1.5: Commit the archive move**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: archive v1 source to src/legacy/ for v2 rewrite

All prior src/* contents moved under src/legacy/ via git mv to preserve
file history. No new code yet — repo intentionally doesn't build until
Task 3 introduces the new entry points. The legacy tree is read-only
reference for the v2 port and will be deleted in Phase 8.

Part of Sub-project 2 Phase 0 (Archive & Scaffold), per
docs/superpowers/specs/2026-04-22-target-architecture-design.md §10.2.
EOF
)"
```

After this step, **the app will not build.** Task 2 fixes dependencies; Task 3 restores a bootable entry point.

---

## Task 2: Swap dependencies (remove Konva, add React Flow + XState + Vitest + Playwright + nanoid)

**Files:**
- Modify: `package.json`
- Regenerated: `pnpm-lock.yaml`

- [ ] **Step 2.1: Remove Konva packages**

Run:
```bash
pnpm remove konva react-konva
```
Expected: packages removed; `pnpm-lock.yaml` regenerated.

- [ ] **Step 2.2: Add runtime dependencies**

Run:
```bash
pnpm add @xyflow/react@^12 xstate@^5 @xstate/react@^5 nanoid@^5
```
Expected: four packages added.

- [ ] **Step 2.3: Add test and tooling dev-dependencies**

Run:
```bash
pnpm add -D vitest@^3 @vitest/coverage-v8@^3 @testing-library/react@^16 @testing-library/user-event@^14 @testing-library/jest-dom@^6 jsdom@^25 @playwright/test@^1.49
```
Expected: seven dev packages added.

- [ ] **Step 2.4: Install Playwright browsers**

Run:
```bash
pnpm exec playwright install --with-deps chromium
```
Expected: Chromium downloads (~100 MB). On CI we'll run the same command before tests.

- [ ] **Step 2.5: Add pnpm scripts**

Modify `package.json`, replace the `"scripts"` block with:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "typecheck": "tsc -b --noEmit",
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "preview": "vite preview"
}
```

- [ ] **Step 2.6: Commit dependency swap**

```bash
git add package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
deps: swap Konva for React Flow; add XState, Vitest, Playwright, nanoid

Removed: konva, react-konva (canvas renderer replaced by SVG-native
React Flow per spec §5).
Added (runtime): @xyflow/react, xstate, @xstate/react, nanoid.
Added (dev): vitest + coverage, @testing-library/react + user-event +
jest-dom, jsdom, @playwright/test.

New scripts: typecheck, test, test:watch, test:coverage, test:e2e.

Part of Sub-project 2 Phase 0 Task 2.
EOF
)"
```

---

## Task 3: Create minimal v2 entry points (blank React Flow canvas)

**Files:**
- Create: `src/canvas/ERCanvas.tsx`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/index.css`

This task restores a buildable app. All exports are **named** (no default exports, per spec §12.1).

- [ ] **Step 3.1: Create `src/index.css`**

Port the design tokens from `src/legacy/index.css`, drop the Konva-specific `.konvajs-content` rule and the `.selection-box` rule (selection box will be built in Phase 4 against React Flow's selection).

File: `src/index.css`
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
	--radius-sm: calc(var(--radius) - 4px);
	--radius-md: calc(var(--radius) - 2px);
	--radius-lg: var(--radius);
	--radius-xl: calc(var(--radius) + 4px);
	--color-background: var(--background);
	--color-foreground: var(--foreground);
	--color-card: var(--card);
	--color-card-foreground: var(--card-foreground);
	--color-popover: var(--popover);
	--color-popover-foreground: var(--popover-foreground);
	--color-primary: var(--primary);
	--color-primary-foreground: var(--primary-foreground);
	--color-secondary: var(--secondary);
	--color-secondary-foreground: var(--secondary-foreground);
	--color-muted: var(--muted);
	--color-muted-foreground: var(--muted-foreground);
	--color-accent: var(--accent);
	--color-accent-foreground: var(--accent-foreground);
	--color-destructive: var(--destructive);
	--color-border: var(--border);
	--color-input: var(--input);
	--color-ring: var(--ring);
	--color-chart-1: var(--chart-1);
	--color-chart-2: var(--chart-2);
	--color-chart-3: var(--chart-3);
	--color-chart-4: var(--chart-4);
	--color-chart-5: var(--chart-5);
	--color-sidebar: var(--sidebar);
	--color-sidebar-foreground: var(--sidebar-foreground);
	--color-sidebar-primary: var(--sidebar-primary);
	--color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
	--color-sidebar-accent: var(--sidebar-accent);
	--color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
	--color-sidebar-border: var(--sidebar-border);
	--color-sidebar-ring: var(--sidebar-ring);
}

:root {
	--radius: 0.625rem;
	--background: oklch(1 0 0);
	--foreground: oklch(0.129 0.042 264.695);
	--card: oklch(1 0 0);
	--card-foreground: oklch(0.129 0.042 264.695);
	--popover: oklch(1 0 0);
	--popover-foreground: oklch(0.129 0.042 264.695);
	--primary: oklch(0.208 0.042 265.755);
	--primary-foreground: oklch(0.984 0.003 247.858);
	--secondary: oklch(0.968 0.007 247.896);
	--secondary-foreground: oklch(0.208 0.042 265.755);
	--muted: oklch(0.968 0.007 247.896);
	--muted-foreground: oklch(0.554 0.046 257.417);
	--accent: oklch(0.968 0.007 247.896);
	--accent-foreground: oklch(0.208 0.042 265.755);
	--destructive: oklch(0.577 0.245 27.325);
	--border: oklch(0.929 0.013 255.508);
	--input: oklch(0.929 0.013 255.508);
	--ring: oklch(0.704 0.04 256.788);
	--chart-1: oklch(0.646 0.222 41.116);
	--chart-2: oklch(0.6 0.118 184.704);
	--chart-3: oklch(0.398 0.07 227.392);
	--chart-4: oklch(0.828 0.189 84.429);
	--chart-5: oklch(0.769 0.188 70.08);
	--sidebar: oklch(0.984 0.003 247.858);
	--sidebar-foreground: oklch(0.129 0.042 264.695);
	--sidebar-primary: oklch(0.208 0.042 265.755);
	--sidebar-primary-foreground: oklch(0.984 0.003 247.858);
	--sidebar-accent: oklch(0.968 0.007 247.896);
	--sidebar-accent-foreground: oklch(0.208 0.042 265.755);
	--sidebar-border: oklch(0.929 0.013 255.508);
	--sidebar-ring: oklch(0.704 0.04 256.788);
}

.dark {
	--background: oklch(0.129 0.042 264.695);
	--foreground: oklch(0.984 0.003 247.858);
	--card: oklch(0.208 0.042 265.755);
	--card-foreground: oklch(0.984 0.003 247.858);
	--popover: oklch(0.208 0.042 265.755);
	--popover-foreground: oklch(0.984 0.003 247.858);
	--primary: oklch(0.929 0.013 255.508);
	--primary-foreground: oklch(0.208 0.042 265.755);
	--secondary: oklch(0.279 0.041 260.031);
	--secondary-foreground: oklch(0.984 0.003 247.858);
	--muted: oklch(0.279 0.041 260.031);
	--muted-foreground: oklch(0.704 0.04 256.788);
	--accent: oklch(0.279 0.041 260.031);
	--accent-foreground: oklch(0.984 0.003 247.858);
	--destructive: oklch(0.704 0.191 22.216);
	--border: oklch(1 0 0 / 10%);
	--input: oklch(1 0 0 / 15%);
	--ring: oklch(0.551 0.027 264.364);
	--chart-1: oklch(0.488 0.243 264.376);
	--chart-2: oklch(0.696 0.17 162.48);
	--chart-3: oklch(0.769 0.188 70.08);
	--chart-4: oklch(0.627 0.265 303.9);
	--chart-5: oklch(0.645 0.246 16.439);
	--sidebar: oklch(0.208 0.042 265.755);
	--sidebar-foreground: oklch(0.984 0.003 247.858);
	--sidebar-primary: oklch(0.488 0.243 264.376);
	--sidebar-primary-foreground: oklch(0.984 0.003 247.858);
	--sidebar-accent: oklch(0.279 0.041 260.031);
	--sidebar-accent-foreground: oklch(0.984 0.003 247.858);
	--sidebar-border: oklch(1 0 0 / 10%);
	--sidebar-ring: oklch(0.551 0.027 264.364);
}

@layer base {
	* {
		@apply border-border outline-ring/50;
		box-sizing: border-box;
	}
	body {
		@apply bg-background text-foreground;
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
			"Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
			"Helvetica Neue", sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		overflow: hidden;
	}

	#root {
		width: 100vw;
		height: 100vh;
	}
}
```

- [ ] **Step 3.2: Create `src/canvas/ERCanvas.tsx`**

File: `src/canvas/ERCanvas.tsx`
```tsx
import { Background, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export const ERCanvas = () => {
  return (
    <ReactFlowProvider>
      <ReactFlow nodes={[]} edges={[]} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 3.3: Create new `src/App.tsx`**

File: `src/App.tsx`
```tsx
import { ERCanvas } from './canvas/ERCanvas'

export const App = () => {
  return (
    <div className="flex h-screen w-screen flex-col">
      <ERCanvas />
    </div>
  )
}
```

- [ ] **Step 3.4: Create new `src/main.tsx`**

File: `src/main.tsx`
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3.5: Exclude `src/legacy/` from TypeScript build**

Modify `tsconfig.app.json`, change the last line from:
```json
  "include": ["src"]
}
```
to:
```json
  "include": ["src"],
  "exclude": ["src/legacy"]
}
```

- [ ] **Step 3.6: Verify typecheck passes**

Run:
```bash
pnpm typecheck
```
Expected: no errors. If TypeScript complains about `@xyflow/react` types, the import chain is wrong — re-check Step 3.2.

- [ ] **Step 3.7: Verify build succeeds**

Run:
```bash
pnpm build
```
Expected: build completes; `dist/` is produced.

- [ ] **Step 3.8: Manually verify dev server renders a blank canvas**

Run:
```bash
pnpm dev
```
Open `http://localhost:5173` in a browser. Expected: a blank white page with the React Flow controls (zoom in/out/fit/lock buttons) in the bottom-left corner and a dotted background grid. No console errors.

Stop the dev server with Ctrl-C.

- [ ] **Step 3.9: Commit the v2 scaffold**

```bash
git add src/main.tsx src/App.tsx src/index.css src/canvas/ERCanvas.tsx tsconfig.app.json
git commit -m "$(cat <<'EOF'
feat: scaffold v2 entry points with blank React Flow canvas

- src/main.tsx: React 19 createRoot entry (named import of App).
- src/App.tsx: app shell renders <ERCanvas />.
- src/canvas/ERCanvas.tsx: minimal React Flow stage with Background +
  Controls; no nodes/edges yet.
- src/index.css: Tailwind v4 tokens ported from legacy/index.css, minus
  Konva-specific .konvajs-content and .selection-box rules (those
  belonged to the legacy renderer).
- tsconfig.app.json: exclude src/legacy/ so the v2 app type-checks
  without Konva or other archived deps.

The dev server now boots to a blank canvas with pan/zoom controls —
the baseline for every subsequent phase.

Part of Sub-project 2 Phase 0 Task 3.
EOF
)"
```

---

## Task 4: Create placeholder folders for future phases

**Files:**
- Create: `.gitkeep` in each layer folder so git tracks them.

- [ ] **Step 4.1: Create placeholder folders with `.gitkeep`**

Run:
```bash
mkdir -p src/app src/domain src/state src/interaction src/notation/chen src/platform src/ui src/canvas/hooks src/canvas/adapters tests/fixtures tests/e2e
touch src/app/.gitkeep src/domain/.gitkeep src/state/.gitkeep src/interaction/.gitkeep src/notation/chen/.gitkeep src/platform/.gitkeep src/ui/.gitkeep src/canvas/hooks/.gitkeep src/canvas/adapters/.gitkeep tests/fixtures/.gitkeep
```

- [ ] **Step 4.2: Verify structure**

Run:
```bash
ls src/
```
Expected: `App.tsx`, `app`, `canvas`, `domain`, `index.css`, `interaction`, `legacy`, `main.tsx`, `notation`, `platform`, `state`, `ui`.

- [ ] **Step 4.3: Commit folder scaffold**

```bash
git add src/app/.gitkeep src/domain/.gitkeep src/state/.gitkeep src/interaction/.gitkeep src/notation/chen/.gitkeep src/platform/.gitkeep src/ui/.gitkeep src/canvas/hooks/.gitkeep src/canvas/adapters/.gitkeep tests/fixtures/.gitkeep
git commit -m "$(cat <<'EOF'
chore: scaffold v2 layer folders per spec §2.3

Creates empty-with-.gitkeep directories for every layer in the target
src/ layout so the structure is tracked in git before any layer has
code. Each folder maps to a phase: domain/ state/ interaction/ notation/
→ Phases 1-3; canvas/hooks + adapters → Phase 4; ui/ platform/ → Phase
6-7; app/ is the bootstrap that wires subscribers in Phase 2.

Part of Sub-project 2 Phase 0 Task 4.
EOF
)"
```

---

## Task 5: Configure Vitest with a smoke test

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `src/canvas/ERCanvas.test.tsx`

This lands the unit-test infrastructure and proves it works end-to-end with a TDD-style pair (write failing test → make pass). The smoke test verifies `<ERCanvas />` mounts without throwing.

- [ ] **Step 5.1: Create `vitest.config.ts`**

File: `vitest.config.ts`
```ts
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/legacy/**', 'tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/legacy/**', '**/*.test.{ts,tsx}', '**/.gitkeep', 'tests/**'],
    },
  },
})
```

- [ ] **Step 5.2: Create `tests/setup.ts`**

File: `tests/setup.ts`
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5.3: Write the failing smoke test for `<ERCanvas />`**

File: `src/canvas/ERCanvas.test.tsx`
```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ERCanvas } from './ERCanvas'

describe('ERCanvas', () => {
  it('mounts and renders a React Flow container', () => {
    const { container } = render(<ERCanvas />)
    const rf = container.querySelector('.react-flow')
    expect(rf).toBeInTheDocument()
  })

  it('renders React Flow controls (zoom in/out/fit-view)', () => {
    render(<ERCanvas />)
    expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fit view/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5.4: Add global type reference for Vitest globals**

Modify `tsconfig.app.json` — add `"vitest/globals"` to the `types` array so `describe` / `it` / `expect` are typed without imports. Change:
```json
"types": ["vite/client"],
```
to:
```json
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
```

- [ ] **Step 5.5: Run the test suite**

Run:
```bash
pnpm test
```
Expected: both test cases pass. If React Flow's controls don't render in jsdom (they require `ResizeObserver` which jsdom lacks), add a polyfill to `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

if (typeof globalThis.DOMRect === 'undefined') {
  globalThis.DOMRect = class {
    left = 0; top = 0; right = 0; bottom = 0; width = 0; height = 0; x = 0; y = 0
    toJSON() { return this }
  } as unknown as typeof DOMRect
}
```

Re-run `pnpm test` — expected: pass.

- [ ] **Step 5.6: Commit Vitest setup**

```bash
git add vitest.config.ts tests/setup.ts src/canvas/ERCanvas.test.tsx tsconfig.app.json
git commit -m "$(cat <<'EOF'
test: add Vitest unit-test infrastructure with ERCanvas smoke test

- vitest.config.ts: jsdom environment, path alias @/, legacy/ excluded
  from test discovery and coverage.
- tests/setup.ts: @testing-library/jest-dom matchers + ResizeObserver
  and DOMRect polyfills for React Flow under jsdom.
- src/canvas/ERCanvas.test.tsx: smoke asserts .react-flow container
  mounts and pan/zoom controls render.
- tsconfig.app.json: extend types with vitest/globals and jest-dom so
  describe/it/expect resolve without per-file imports.

Part of Sub-project 2 Phase 0 Task 5.
EOF
)"
```

---

## Task 6: Configure Playwright with an E2E smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Modify: `.gitignore` (add Playwright report dirs)

- [ ] **Step 6.1: Create `playwright.config.ts`**

File: `playwright.config.ts`
```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 6.2: Write the smoke E2E test**

File: `tests/e2e/smoke.spec.ts`
```ts
import { expect, test } from '@playwright/test'

test.describe('App boot smoke', () => {
  test('root page renders a React Flow canvas with controls', async ({ page }) => {
    await page.goto('/')

    const canvas = page.locator('.react-flow')
    await expect(canvas).toBeVisible()

    const zoomIn = page.getByLabel(/zoom in/i)
    const zoomOut = page.getByLabel(/zoom out/i)
    const fitView = page.getByLabel(/fit view/i)
    await expect(zoomIn).toBeVisible()
    await expect(zoomOut).toBeVisible()
    await expect(fitView).toBeVisible()
  })

  test('there are no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })
})
```

- [ ] **Step 6.3: Update `.gitignore`**

Read current `.gitignore`, then append these lines (if not present) to the bottom:
```
# Playwright
test-results/
playwright-report/
playwright/.cache/
blob-report/
```

Run:
```bash
cat >> .gitignore <<'EOF'

# Playwright
test-results/
playwright-report/
playwright/.cache/
blob-report/
EOF
```

- [ ] **Step 6.4: Run the E2E smoke test**

Run:
```bash
pnpm test:e2e
```
Expected: Playwright starts the dev server, runs both tests in Chromium, both pass. If `ECONNREFUSED`, the dev server didn't start in time — raise `webServer.timeout` in `playwright.config.ts`.

- [ ] **Step 6.5: Commit Playwright setup**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts .gitignore
git commit -m "$(cat <<'EOF'
test: add Playwright E2E infrastructure with boot smoke test

- playwright.config.ts: Chromium project, auto-starts pnpm dev,
  baseURL http://localhost:5173, GitHub reporter in CI, retries
  twice under CI, traces on first retry.
- tests/e2e/smoke.spec.ts: asserts the app boots, renders a React
  Flow canvas with zoom controls, and logs zero console errors.
- .gitignore: exclude Playwright artifact directories.

Part of Sub-project 2 Phase 0 Task 6.
EOF
)"
```

---

## Task 7: Configure ESLint — file size + no default export + layer boundaries + legacy ignore

**Files:**
- Modify: `eslint.config.js`

Rules per spec §12.1:
- `max-lines` warn at 350 (not error).
- `max-lines-per-function` warn at 100.
- `complexity` warn at 15.
- `no-restricted-syntax` blocking `ExportDefaultDeclaration` in `src/**/*.{ts,tsx}` (config files allowed).
- `no-restricted-imports` blocking imports of `**/legacy/**` outside `src/legacy/`.
- Layer-boundary enforcement via layered `no-restricted-imports` config overrides (one per layer).
- Ignore `src/legacy/**` globally.

- [ ] **Step 7.1: Rewrite `eslint.config.js`**

File: `eslint.config.js`
```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/** Layer-dependency table — negated list per layer (forbidden imports). */
const forbiddenByLayer = {
  domain: [
    '@/state/**', '@/state', '@/interaction/**', '@/interaction',
    '@/notation/**', '@/notation', '@/canvas/**', '@/canvas',
    '@/ui/**', '@/ui', '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  platform: [
    '@/state/**', '@/state', '@/interaction/**', '@/interaction',
    '@/notation/**', '@/notation', '@/canvas/**', '@/canvas',
    '@/ui/**', '@/ui', '@/app/**', '@/app',
  ],
  state: [
    '@/interaction/**', '@/interaction', '@/notation/**', '@/notation',
    '@/canvas/**', '@/canvas', '@/ui/**', '@/ui',
    '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  interaction: [
    '@/notation/**', '@/notation', '@/canvas/**', '@/canvas',
    '@/ui/**', '@/ui', '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  notation: [
    '@/state/**', '@/state', '@/interaction/**', '@/interaction',
    '@/canvas/**', '@/canvas', '@/ui/**', '@/ui',
    '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  canvas: [
    '@/ui/**', '@/ui', '@/platform/**', '@/platform', '@/app/**', '@/app',
  ],
  ui: [
    '@/app/**', '@/app',
  ],
}

const layerRule = (forbidden) => ({
  'no-restricted-imports': ['error', {
    patterns: [
      ...forbidden.map((p) => ({ group: [p], message: 'Layer-boundary violation — see spec §2.2.' })),
      { group: ['**/legacy/**', '*/legacy/*'], message: 'legacy/ is reference-only.' },
    ],
  }],
})

export default defineConfig([
  globalIgnores(['dist', 'src/legacy/**', 'playwright-report', 'test-results', 'coverage']),

  // Base config for all TS/TSX files in src/ and tests/.
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      'max-lines': ['warn', { max: 350, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use named exports (see spec §8.3).' },
      ],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/legacy/**', '*/legacy/*'], message: 'legacy/ is reference-only.' },
        ],
      }],
    },
  },

  // Layer-boundary overrides. Each layer's forbidden imports are declared above.
  { files: ['src/domain/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.domain) },
  { files: ['src/platform/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.platform) },
  { files: ['src/state/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.state) },
  { files: ['src/interaction/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.interaction) },
  { files: ['src/notation/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.notation) },
  { files: ['src/canvas/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.canvas) },
  { files: ['src/ui/**/*.{ts,tsx}'], rules: layerRule(forbiddenByLayer.ui) },

  // src/App.tsx and src/main.tsx are the composition root — relax the layer rule.
  {
    files: ['src/App.tsx', 'src/main.tsx'],
    rules: { 'no-restricted-imports': ['error', {
      patterns: [{ group: ['**/legacy/**', '*/legacy/*'], message: 'legacy/ is reference-only.' }],
    }] },
  },

  // Config files can use default exports.
  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'tailwind.config.js', 'eslint.config.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
])
```

- [ ] **Step 7.2: Run ESLint**

Run:
```bash
pnpm lint
```
Expected: no errors, no warnings (file sizes are tiny, no default exports in `src/`, no cross-layer imports yet).

If any warning fires (e.g., `max-lines` on `index.css` — it's CSS so it shouldn't be linted; if ESLint picks up something unexpected, narrow the `files` globs).

- [ ] **Step 7.3: Write a negative test for the legacy-import rule**

Create a throwaway file to prove the rule catches violations, then delete it.

Run:
```bash
cat > src/canvas/__legacy_import_probe.ts <<'EOF'
// This file intentionally violates the legacy-import rule to verify ESLint catches it.
// Delete this file immediately after the lint check.
import '../legacy/App'
EOF
pnpm lint src/canvas/__legacy_import_probe.ts
```
Expected: lint fails with "legacy/ is reference-only." on the import line.

Now delete the probe file:
```bash
rm src/canvas/__legacy_import_probe.ts
```
Re-verify lint is clean:
```bash
pnpm lint
```
Expected: no errors.

- [ ] **Step 7.4: Write a negative test for the default-export rule**

Similar approach. Run:
```bash
cat > src/canvas/__default_export_probe.ts <<'EOF'
const thing = 1
export default thing
EOF
pnpm lint src/canvas/__default_export_probe.ts
```
Expected: lint fails with "Use named exports (see spec §8.3)."

Delete:
```bash
rm src/canvas/__default_export_probe.ts
pnpm lint
```
Expected: no errors.

- [ ] **Step 7.5: Commit ESLint config**

```bash
git add eslint.config.js
git commit -m "$(cat <<'EOF'
chore(eslint): enforce layer boundaries, file size, and named exports

- max-lines warns at 350 (soft limit per user feedback; tightened later).
- max-lines-per-function warns at 100; complexity warns at 15.
- no-restricted-syntax blocks ExportDefaultDeclaration in src/
  (config files exempted).
- no-restricted-imports blocks legacy/ imports from outside legacy/.
- Per-layer overrides enforce the dependency direction from spec §2.2:
  domain ← (nothing), platform/state ← domain, interaction ← domain
  + state, notation ← domain, canvas ← domain + state + interaction
  + notation, ui ← below, app ← everything.
- Globally ignore src/legacy/**, dist/, playwright-report/,
  test-results/, coverage/.

Part of Sub-project 2 Phase 0 Task 7.
EOF
)"
```

---

## Task 8: Set up CI workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/e2e.yml`

Two workflows per spec §10.2:
- `ci.yml` — lint + typecheck + unit tests on every push and PR. Fail fast.
- `e2e.yml` — Playwright on PR to `main` and nightly.

- [ ] **Step 8.1: Create `.github/workflows/ci.yml`**

File: `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main, v2]
  pull_request:
    branches: [main, v2]

jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit tests
        run: pnpm test
```

- [ ] **Step 8.2: Create `.github/workflows/e2e.yml`**

File: `.github/workflows/e2e.yml`
```yaml
name: E2E

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 3 * * *'  # nightly at 03:00 UTC
  workflow_dispatch:

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run Playwright
        run: pnpm test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 8.3: Verify the workflow files are valid YAML**

Run:
```bash
pnpm exec prettier --check .github/workflows/*.yml 2>/dev/null || true
node -e "const yaml = require('js-yaml'); const fs = require('fs'); ['ci.yml','e2e.yml'].forEach(f => yaml.load(fs.readFileSync('.github/workflows/'+f, 'utf8')))" 2>/dev/null || echo "(js-yaml not installed — skipping syntactic parse)"
```
If neither check is available, open each file and skim for indentation; GitHub will also surface errors when the workflow first runs.

- [ ] **Step 8.4: Commit CI workflows**

```bash
git add .github/workflows/ci.yml .github/workflows/e2e.yml
git commit -m "$(cat <<'EOF'
ci: add GitHub Actions workflows for lint/typecheck/unit and e2e

- ci.yml: runs on every push and PR to main/v2 — pnpm install, lint,
  typecheck, unit tests. Fast feedback target <90 s.
- e2e.yml: runs on PR to main, nightly at 03:00 UTC, and
  manually via workflow_dispatch. Installs Chromium + deps and
  uploads the Playwright report as an artifact on failure.

Part of Sub-project 2 Phase 0 Task 8.
EOF
)"
```

---

## Task 9: Final exit-criteria verification

Verify all Phase 0 exit criteria from spec §10.2 in one pass.

- [ ] **Step 9.1: Clean working tree**

Run:
```bash
git status
```
Expected: `working tree clean`.

- [ ] **Step 9.2: `pnpm install` is idempotent**

Run:
```bash
pnpm install --frozen-lockfile
```
Expected: no changes reported; lockfile consistent.

- [ ] **Step 9.3: `pnpm lint` passes**

Run:
```bash
pnpm lint
```
Expected: no errors, no warnings.

- [ ] **Step 9.4: `pnpm typecheck` passes**

Run:
```bash
pnpm typecheck
```
Expected: no errors.

- [ ] **Step 9.5: `pnpm test` passes**

Run:
```bash
pnpm test
```
Expected: two test cases from `src/canvas/ERCanvas.test.tsx` pass.

- [ ] **Step 9.6: `pnpm build` succeeds**

Run:
```bash
pnpm build
```
Expected: build completes; `dist/` contains `index.html`, `assets/`.

- [ ] **Step 9.7: `pnpm test:e2e` passes**

Run:
```bash
pnpm test:e2e
```
Expected: Playwright starts the dev server and both smoke tests pass.

- [ ] **Step 9.8: Verify `src/legacy/` is isolated**

Run:
```bash
grep -R "from.*legacy" src/ --include="*.ts" --include="*.tsx" --exclude-dir=legacy || echo "OK — no imports from legacy/ outside legacy/"
```
Expected: the `|| echo "OK..."` clause fires because `grep` found nothing.

- [ ] **Step 9.9: Verify new `src/` structure matches spec §2.3**

Run:
```bash
ls src/ && ls src/canvas/ && ls src/notation/
```
Expected:
```
App.tsx  app  canvas  domain  index.css  interaction  legacy  main.tsx  notation  platform  state  ui
# src/canvas/
ERCanvas.test.tsx  ERCanvas.tsx  adapters  hooks
# src/notation/
chen
```

- [ ] **Step 9.10: Push to origin (optional — ask user before running)**

`git push` publishes commits to `origin/v2` and triggers CI. Before running this, ask the user to confirm.

If confirmed:
```bash
git push origin v2
```
Expected: remote updates and the `CI` workflow runs on the pushed commits.

- [ ] **Step 9.11: Tag Phase 0 complete**

After CI is green:
```bash
git tag phase-0-scaffold
```
Local tag only — the user decides whether to push it.

---

## Phase 0 complete when

- All steps 9.1–9.9 pass locally.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all green.
- CI workflow file present; when pushed, CI is green.
- `src/legacy/` is the archive; `src/` (outside `legacy/`) contains only the new scaffold.
- No imports from `legacy/` outside `legacy/` (grep-verified and ESLint-enforced).

The next plan to write is **Phase 1 — Domain layer** (ports the validation rules and implements `domain/types.ts`, `geometry.ts`, `graph.ts`, `id.ts`, `invariants.ts`). Phase 1 can start as soon as Phase 0 is merged or verified locally.
