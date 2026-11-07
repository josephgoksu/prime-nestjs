import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC is required so decorator metadata (used by Nest dependency injection)
// is emitted. esbuild, Vite's default transformer, does not emit it.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    // Tracing stays off even when the shell sets an OTLP endpoint: instrumentation.ts
    // requires the compiled tracing.js, which Node cannot resolve from src/ under Vitest.
    env: { OTEL_SDK_DISABLED: 'true' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/migrations/**'],
      reportsDirectory: './coverage',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
