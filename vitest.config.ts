import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary', 'lcov'],
        include: ['src/**/*.{ts,vue}', 'server/**/*.ts'],
        exclude: [
          'src/main.ts',
          'src/env.d.ts',
          'server/index.ts',
          'server/types/**',
          '**/*.spec.ts',
          '**/*.test.ts',
          '**/node_modules/**',
        ],
      },
    },
  }),
)
