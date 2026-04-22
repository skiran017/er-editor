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
