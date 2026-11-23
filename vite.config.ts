import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project at /<repo-name>/. Override with VITE_BASE if the
// repository is renamed or deployed on a custom domain (use "/" for a custom domain).
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : (process.env.VITE_BASE ?? '/EquityLens/'),
  plugins: [react()],
  build: { sourcemap: true, chunkSizeWarningLimit: 700 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
