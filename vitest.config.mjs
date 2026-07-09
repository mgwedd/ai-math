import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The curriculum is framework-free ESM that imports a browser-oriented engine;
// a plain node environment (with the DOM stubs in the test file) is all the
// data-layer smoke tests need — no jsdom dependency.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.mjs'],
  },
  resolve: {
    // Mirror jsconfig.json's "@/*" -> project-root alias so the KB route test
    // can import the API route (and mock @/lib/*) exactly as Next.js resolves.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
});
