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
