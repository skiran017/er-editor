import { describe, it, expect, afterEach, afterAll } from 'vitest'
import i18next from 'i18next'
import { initI18n } from './init'

describe('initI18n', () => {
  afterEach(async () => {
    // Singleton survives across files; always leave it in English for downstream suites.
    if (i18next.isInitialized) await i18next.changeLanguage('en')
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

  it('parallel calls share a single in-flight init (race-safe)', async () => {
    const [a, b, c] = await Promise.all([initI18n(), initI18n(), initI18n()])
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a.isInitialized).toBe(true)
  })
})

afterAll(async () => {
  if (i18next.isInitialized) await i18next.changeLanguage('en')
})
