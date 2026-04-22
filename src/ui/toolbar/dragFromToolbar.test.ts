import { describe, it, expect } from 'vitest'
import type { DragEvent } from 'react'
import { writeToolToDataTransfer, readToolFromDataTransfer, TOOL_MIME } from './dragFromToolbar'

const mkEvent = (): DragEvent<HTMLElement> => {
  const store = new Map<string, string>()
  return {
    dataTransfer: {
      effectAllowed: 'none',
      setData: (k: string, v: string) => { store.set(k, v) },
      getData: (k: string) => store.get(k) ?? '',
    } as unknown as DataTransfer,
  } as unknown as DragEvent<HTMLElement>
}

describe('dragFromToolbar', () => {
  it('TOOL_MIME is application/x-er-tool', () => {
    expect(TOOL_MIME).toBe('application/x-er-tool')
  })

  it('round-trips: write then read yields the toolId', () => {
    const e = mkEvent()
    writeToolToDataTransfer(e, 'entity')
    expect(readToolFromDataTransfer(e)).toBe('entity')
  })

  it('read returns null when no tool has been written', () => {
    const e = mkEvent()
    expect(readToolFromDataTransfer(e)).toBeNull()
  })

  it('write sets effectAllowed to copy', () => {
    const e = mkEvent()
    writeToolToDataTransfer(e, 'relationship')
    expect(e.dataTransfer.effectAllowed).toBe('copy')
  })
})
