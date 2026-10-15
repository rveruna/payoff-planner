import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The deployed demo lives under a sub-path (see .github/workflows/pages.yml)
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // the Expo app in mobile/ has its own tests, run with Jest
    exclude: [...configDefaults.exclude, 'mobile/**'],
    // the property tests and the axe checks of a 600-month table are quick here but slower on a shared build machine
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
});
