import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/ui/**/*.test.tsx'],
          setupFiles: ['./tests/setup.ui.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // `page.tsx` only awaits Next's `connection()` and renders a component that is tested on
      // its own; `src/types` holds declarations with no runtime code.
      exclude: ['src/app/page.tsx', 'src/types/**'],
      reporter: ['text-summary', 'lcov'],
      // A floor set just under what is measured today: coverage may rise but never quietly erode.
      thresholds: { statements: 98, branches: 93, functions: 98, lines: 98 },
    },
  },
});
