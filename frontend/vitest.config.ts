import {defineConfig, mergeConfig} from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom', // needed for React hooks
            globals: true,
            setupFiles: ['./src/test/setup.ts'],
            disableConsoleIntercept: true,
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
                include: ['src/**'],
                exclude: ['**/types/**', '**/constants/**'],
                thresholds: {
                    lines: 80,
                    functions: 80,
                    branches: 80,
                    statements: 80
                }
            }
        }
    }))