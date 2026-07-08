import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom', // needed for React hooks
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
    }
})