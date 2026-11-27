import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom n'implémente pas matchMedia (utilisé par useTheme).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
