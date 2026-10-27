import { defineConfig, Rolldown } from 'tsdown';

export const workerPlugin = {
  name: 'worker-code-plugin',
  resolveId(id: string) {
    if (id === 'virtual:worker-code') {
      return '\0virtual:worker-code';
    }
  },
  async load(id: string) {
    if (id === '\0virtual:worker-code') {
      const bundle = await Rolldown.rolldown({
        input: 'src/worker-runner.ts',
        platform: 'node',
        external: ['node:worker_threads', 'worker_threads'],
      });
      const res = await bundle.generate({ format: 'cjs' });
      return `export default ${JSON.stringify(res.output[0].code)};`;
    }
  },
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  platform: 'node',
  plugins: [workerPlugin],
});
