import { parentPort, workerData } from 'node:worker_threads';
import { calculateBM25 } from './bm25.js';
import type { WorkerInputPayload } from './types.js';

try {
  const { docs, config } = workerData as WorkerInputPayload;
  const output = calculateBM25(docs, config);
  parentPort?.postMessage(output);
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  parentPort?.postMessage({ error: message });
}
