import { defineConfig } from 'vitest/config';
import { workerPlugin } from './tsdown.config.js';

export default defineConfig({
  plugins: [workerPlugin as any],
});
