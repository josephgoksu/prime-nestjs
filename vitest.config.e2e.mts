import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // The e2e suite logs in more often than the production auth limit allows.
    env: { THROTTLE_AUTH_LIMIT: '1000', THROTTLE_LIMIT: '10000' },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
