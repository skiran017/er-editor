import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fixtures': path.resolve(__dirname, './tests/fixtures'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/fixtures/**/*.test.{ts,tsx}'],
    exclude: ['src/legacy/**', 'tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/legacy/**', '**/*.test.{ts,tsx}', '**/.gitkeep', 'tests/**'],
      thresholds: {
        'src/domain/**': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        'src/notation/chen/rules/**': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/state/**': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/app/**': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/interaction/**': {
          statements: 90,
          // XState setup({ guards, actions }) declares many short arrow
          // functions; not every one is reachable from within a single test
          // run even with full state-transition coverage. 60% functions
          // reflects the realistic floor for machine.ts + actions.ts.
          branches: 75,
          functions: 60,
          lines: 90,
        },
        'src/canvas/hooks/**': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/canvas/adapters/**': {
          statements: 100,
          branches: 90,
          functions: 100,
          lines: 100,
        },
        'src/canvas/notation-adapters/**': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
        'src/canvas/**': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
        'src/notation/chen/nodes/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/notation/chen/edges/**': {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        'src/notation/chen/**': {
          statements: 85,
          branches: 75,
          functions: 85,
          lines: 85,
        },
      },
    },
  },
})
