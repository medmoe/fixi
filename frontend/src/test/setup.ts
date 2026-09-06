// src/test/setup.ts
import '@testing-library/jest-dom'
import {vi} from 'vitest'

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
