import { Worker } from 'node:worker_threads';
import type { RawDoc, RelatedPostResult, ResolvedConfig, WorkerInputPayload } from './types.js';
import { calculateBM25 } from './bm25.js';
import workerCode from 'virtual:worker-code';

export function executeBM25(
  docs: RawDoc[],
  config: ResolvedConfig
): Promise<RelatedPostResult> {
  // Graceful degradation / synchronous bypass if worker is disabled or post count is small
  if (!config.worker || docs.length < config.min_docs_for_worker) {
    return Promise.resolve(calculateBM25(docs, config));
  }

  return new Promise<RelatedPostResult>((resolve) => {
    try {
      const worker = new Worker(workerCode, {
        eval: true,
        workerData: { docs, config } satisfies WorkerInputPayload,
      });

      let hasSettled = false;

      worker.on('message', (message: RelatedPostResult | { error: string }) => {
        if (hasSettled) return;
        hasSettled = true;

        if (message && typeof message === 'object' && 'error' in message) {
          resolve(calculateBM25(docs, config));
        } else {
          resolve(message as RelatedPostResult);
        }
      });

      worker.on('error', () => {
        if (hasSettled) return;
        hasSettled = true;
        resolve(calculateBM25(docs, config));
      });

      worker.on('exit', (exitCode) => {
        if (hasSettled) return;
        hasSettled = true;
        if (exitCode !== 0) {
          resolve(calculateBM25(docs, config));
        }
      });
    } catch {
      resolve(calculateBM25(docs, config));
    }
  });
}
