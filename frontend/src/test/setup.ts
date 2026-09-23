// src/test/setup.ts
import '@testing-library/jest-dom'
import {vi} from 'vitest'
// Real apps guarantee this via a side-effect import in main.tsx before
// anything renders. Isolated component tests don't go through main.tsx, so
// without this, any component calling useTranslation() hits an
// unconfigured i18next instance and t() just echoes the raw key back --
// global here so every test file gets a real, initialized i18next for
// free, without each one needing its own `import '@/lib/i18n'`.
import '@/lib/i18n'

const { getComputedStyle } = window
window.getComputedStyle = (elt) => getComputedStyle(elt)

// ResizeObserver — used by Radix Slider, Tooltip, Popover
global.ResizeObserver = class ResizeObserver {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
}

// IntersectionObserver — used by some Radix components
global.IntersectionObserver = class IntersectionObserver {
    observe() {
    }

    unobserve() {
    }

    disconnect() {
    }
} as any

// matchMedia — used by responsive Radix components
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// URL.createObjectURL — used by file upload components
global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url')
global.URL.revokeObjectURL = vi.fn()
