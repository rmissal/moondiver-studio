import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'lcov', 'html'],
      include: ['lib/**/*.js'],
      exclude: ['node_modules/**', 'test/**', 'ffmpeg/**']
    }
  }
});
