import { defineConfig } from 'vitest/config';

// The curriculum is framework-free ESM that imports a browser-oriented engine;
// a plain node environment (with the DOM stubs in the test file) is all the
// data-layer smoke tests need — no jsdom dependency.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.mjs'],
  },
});
