import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { installSubscribers } from './bootstrap'
import { useDiagramStore } from '@/state/diagramStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import type { NodeInput } from '@/state/types'

vi.mock('i18next', () => {
  const store = { initialized: false, lang: 'en' }
  return {
    default: {
      get isInitialized() { return store.initialized },
      get language() { return store.lang },
      changeLanguage: vi.fn((l: string) => { store.lang = l; return Promise.resolve() }),
      _setInitialized: (v: boolean) => { store.initialized = v },
    },
  }
})

const entity = (name = 'Lonely'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

beforeEach(async () => {
  vi.useFakeTimers()
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useValidationStore.setState({ errorsById: {}, enabled: true })
  useUiStore.getState().setExamMode(false)
  useUiStore.setState({ language: 'en' })
  const i18next = (await import('i18next')).default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(i18next as any)._setInitialized(false)
  vi.mocked(i18next.changeLanguage).mockClear()
})
afterEach(() => { vi.useRealTimers() })

describe('installSubscribers', () => {
  it('populates validationStore after a diagram mutation + 150ms debounce', () => {
    const cleanup = installSubscribers()
    useDiagramStore.getState().addNode(entity('Lonely'))
    // Before debounce fires, errorsById should still be empty.
    expect(useValidationStore.getState().errorsById).toEqual({})
    vi.advanceTimersByTime(150)
    // After debounce: orphan-warning for the lonely entity + must-have-key + must-have-attribute
    const errs = useValidationStore.getState().errorsById
    const flat = Object.values(errs).flat()
    expect(flat.map((e) => e.ruleId)).toEqual(
      expect.arrayContaining([
        'chen.entity.must-have-key',
        'chen.entity.must-have-attribute',
        'chen.entity.orphan-warning',
      ]),
    )
    cleanup()
  })

  it('does not populate when validationStore.enabled is false', () => {
    useValidationStore.getState().setEnabled(false)
    const cleanup = installSubscribers()
    useDiagramStore.getState().addNode(entity('Lonely'))
    vi.advanceTimersByTime(150)
    expect(useValidationStore.getState().errorsById).toEqual({})
    cleanup()
  })

  it('cleanup unsubscribes — later mutations do not re-fire the validator', () => {
    const cleanup = installSubscribers()
    cleanup()
    useDiagramStore.getState().addNode(entity('X'))
    vi.advanceTimersByTime(500)
    expect(useValidationStore.getState().errorsById).toEqual({})
  })

  it('entering exam mode forces validation.enabled off and clears existing badges', () => {
    const cleanup = installSubscribers()
    useValidationStore.setState({ enabled: true })
    // Seed a badge so we can verify it's cleared on exam mode entry.
    useDiagramStore.getState().addNode(entity('Lonely'))
    vi.advanceTimersByTime(150)
    expect(Object.keys(useValidationStore.getState().errorsById).length).toBeGreaterThan(0)

    useUiStore.getState().setExamMode(true)
    expect(useValidationStore.getState().enabled).toBe(false)
    // validation-toggle subscriber (bootstrap.ts) clears on false.
    expect(useValidationStore.getState().errorsById).toEqual({})
    cleanup()
  })

  it('leaving exam mode does NOT auto-re-enable validation — user decides', () => {
    const cleanup = installSubscribers()
    useUiStore.getState().setExamMode(true)
    expect(useValidationStore.getState().enabled).toBe(false)
    useUiStore.getState().setExamMode(false)
    // Intentionally sticky: validation stays off until the user toggles it
    // on themselves, so exam mode doesn't masquerade as "always re-enable".
    expect(useValidationStore.getState().enabled).toBe(false)
    cleanup()
  })

  it('language subscriber calls i18next.changeLanguage when language changes and i18next is initialized', async () => {
    const i18next = (await import('i18next')).default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(i18next as any)._setInitialized(true)
    const cleanup = installSubscribers()
    useUiStore.getState().setLanguage('it')
    expect(vi.mocked(i18next.changeLanguage)).toHaveBeenCalledWith('it')
    cleanup()
  })

  it('language subscriber is a no-op when i18next is not yet initialized', async () => {
    const i18next = (await import('i18next')).default
    // _setInitialized stays false from beforeEach
    const cleanup = installSubscribers()
    useUiStore.getState().setLanguage('it')
    expect(vi.mocked(i18next.changeLanguage)).not.toHaveBeenCalled()
    cleanup()
  })
})
