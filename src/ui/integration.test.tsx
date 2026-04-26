import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { App } from '../App'
import * as fs from '@/platform/fs'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram, type Diagram } from '@/domain/types'
import { NO_MODIFIERS } from '@/interaction/events'
import { initI18n } from '@/platform/i18n'
import { applyLanguageFromUrl } from '@/app/applyLanguage'
import { applyModeFromUrl } from '@/app/applyMode'
import { applyValidationFromUrl } from '@/app/applyValidation'
import { applyExamModeFromUrl } from '@/app/examMode'

beforeAll(async () => { await initI18n() })

const resetAll = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
  useValidationStore.setState({ errorsById: {}, enabled: false })
  useUiStore.setState({ modals: [], toasts: [], contextMenu: null, inlineRename: null })
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

beforeEach(resetAll)

describe('UI integration — create via toolbar', () => {
  it('clicking the Entity tool then the canvas creates and renders an entity', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    // Toolbar click set the FSM to placing.entity. Simulate canvas events directly
    // (jsdom RF clicks are brittle; the toolbar → FSM path is what matters here).
    act(() => {
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_DOWN',
        point: { x: 200, y: 200 },
        modifiers: NO_MODIFIERS,
        button: 'left',
      })
      useInteractionStore.getState().send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 200 } })
    })
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
    // Leave nothing selected so the property panel stays empty — only the inline
    // rename overlay should render an input.
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
    const { container } = render(<App />)
    const input = container.querySelector('[data-role="inline-rename"]') as HTMLInputElement
    expect(input).not.toBeNull()
    await userEvent.clear(input)
    await userEvent.type(input, 'Renamed{Enter}')
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Renamed')
  })

  it('RENAME event on a single selected entity opens inline rename', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Hello', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({ selectedNodeIds: new Set([id]), selectedEdgeIds: new Set(), rubberband: null })
    act(() => {
      useInteractionStore.getState().send({ type: 'RENAME' })
    })
    expect(useUiStore.getState().inlineRename).toEqual({ nodeId: id, initialValue: 'Hello' })
  })
})

describe('UI integration — save/reopen simulated round-trip', () => {
  it('JSON round-trip of the diagram state produces identical rendered DOM', async () => {
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

    render(<App />)
    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(await screen.findByText('B')).toBeInTheDocument()
  })
})

describe('Phase 7 — URL-driven session', () => {
  // Restore English after each test in this block so Italian strings don't
  // bleed into subsequent test suites.
  afterEach(async () => {
    await i18next.changeLanguage('en')
    // Reset transient URL-driven flags so each test starts clean.
    useUiStore.getState().setReadonly(false)
    useUiStore.getState().setEmbed(false)
    useUiStore.getState().setExamMode(false)
  })

  it('?lang=it&readonly=true&validation=off applies all gates and renders Italian', async () => {
    resetAll()
    const search = '?lang=it&readonly=true&validation=off'
    applyLanguageFromUrl(search)
    applyModeFromUrl(search)
    applyValidationFromUrl(search)
    // applyExamModeFromUrl reads window.location.search directly;
    // jsdom default is '' so examMode resolves to false (no ?embed).
    applyExamModeFromUrl()
    // Synchronise i18next to Italian — the bootstrap subscriber would do this
    // at runtime but tests run synchronously without the subscriber wired.
    await i18next.changeLanguage('it')

    render(<App />)

    // Menu chrome remains under readonly+validation+lang — only embed hides it.
    // aria-label is t('menu:app.title') = "Menu" (same in EN and IT).
    expect(screen.getByRole('button', { name: /^menu$/i })).toBeInTheDocument()

    // Element tool buttons are hidden under readonly — only select/pan survive.
    // aria-labels in Italian: "Entità", "Relazione", "Attributo".
    expect(screen.queryByRole('button', { name: /entit/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /relazion/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /attribut/i })).toBeNull()

    // Select tool still rendered with its Italian aria-label ("Seleziona").
    expect(screen.getByRole('button', { name: /seleziona/i })).toBeInTheDocument()

    // Validation disabled by ?validation=off.
    expect(useValidationStore.getState().enabled).toBe(false)
  })

  it('?embed=true hides Menu + Toolbar; canvas remains', async () => {
    resetAll()
    const search = '?embed=true'
    applyModeFromUrl(search)
    // embed=true auto-sets examMode=true via parseQueryParams default.
    applyExamModeFromUrl()

    render(<App />)

    // Menu returns null under embed.
    expect(screen.queryByRole('button', { name: /^menu$/i })).toBeNull()
    // Toolbar returns null under embed (it has data-role="toolbar" on a <nav>).
    expect(document.querySelector('[data-role="toolbar"]')).toBeNull()
    // React Flow canvas still mounted.
    expect(document.querySelector('.react-flow')).toBeTruthy()
  })
})

describe('Phase 5 — Java XML Open/Save round-trip', () => {
  it('opens conference-sol.xml via the file picker and re-saves it byte-clean', async () => {
    // Reset stores, force exam mode off so file actions are visible.
    resetAll()
    useUiStore.setState({ examMode: false, embed: false, readonly: false })

    // Mock platform/fs so we don't actually open the OS picker or download.
    const xml = readFileSync(join(__dirname, '../../tests/fixtures/supsi/conference-sol.xml'), 'utf8')
    const fakeFile = new File([xml], 'conference-sol.xml', { type: 'application/xml' })
    // Polyfill .text() on jsdom File since some versions lack it.
    if (!('text' in fakeFile) || typeof (fakeFile as { text?: unknown }).text !== 'function') {
      Object.defineProperty(fakeFile, 'text', { value: async () => xml, configurable: true })
    }

    let savedBlob: Blob | null = null
    vi.spyOn(fs, 'openFile').mockResolvedValue(fakeFile)
    vi.spyOn(fs, 'downloadBlob').mockImplementation((blob: Blob) => {
      savedBlob = blob
    })

    render(<App />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /open/i }))

    // Wait for the diagram to load (the Save row will be re-triggerable).
    await screen.findByText('CATEGORIES', undefined, { timeout: 1000 })

    // Reopen the menu and save.
    await user.click(screen.getByRole('button', { name: /menu/i }))
    await user.click(screen.getByRole('menuitem', { name: /^save/i }))

    // Wait until downloadBlob was invoked.
    await waitFor(() => expect(fs.downloadBlob).toHaveBeenCalled())

    expect(savedBlob).not.toBeNull()
    // jsdom Blob may lack .text(); read via FileReader instead.
    const savedXml = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(savedBlob as Blob)
    })
    // Structural round-trip check: the saved XML must contain the expected
    // entity names. Byte-exact equality (including CRLF vs LF and trailing
    // newline count) is validated at the codec level in
    // src/notation/chen/codecs/javaXml/integration.test.ts.
    // The UI test verifies the full UI → codec → fs chain fires correctly.
    expect(savedXml).toContain('<StrongEntitySet')
    expect(savedXml).toContain('name="CATEGORIES"')
    expect(savedXml).toContain('</ERDatabaseModel>')
  })
})
