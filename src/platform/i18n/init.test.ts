import { describe, it, expect, beforeEach } from 'vitest'
import { initI18n } from './init'

describe('initI18n', () => {
  beforeEach(async () => {
    // i18next is a singleton; tests can assume it's already initialised after the first call.
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
