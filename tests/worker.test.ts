import { describe, expect, it } from 'vitest';
import { calculateBM25 } from '../src/bm25.js';
import { executeBM25 } from '../src/worker.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import type { RawDoc } from '../src/types.js';

describe('Worker Thread Execution Specification (SDD)', () => {
  const corpus: RawDoc[] = [
    {
      id: 'doc-a',
      path: 'p/a',
      title: 'Deep dive into TypeScript Generics and Conditional Types',
      content: 'TypeScript provides conditional types, infer keyword, mapped types, and template literal types for advanced type safety.',
      tags: ['TypeScript', 'JavaScript'],
      categories: ['Programming'],
    },
    {
      id: 'doc-b',
      path: 'p/b',
      title: 'Advanced TypeScript Utility Types Handbook',
      content: 'Learn how Partial, Required, Readonly, Pick, Omit, and custom conditional types work under the hood in TypeScript.',
      tags: ['TypeScript', 'Engineering'],
      categories: ['Programming'],
    },
    {
      id: 'doc-c',
      path: 'p/c',
      title: 'How to brew traditional Italian espresso coffee',
      content: 'Espresso requires fine coffee grounds, 9 bars of extraction pressure, and fresh roast beans for a rich crema.',
      tags: ['Coffee', 'Lifestyle'],
      categories: ['Culinary'],
    },
  ];

  it('should return identical results between synchronous mode and worker thread', async () => {
    const syncResult = calculateBM25(corpus, {
      ...DEFAULT_CONFIG,
      filter_threshold: 0.1,
    });

    const workerResult = await executeBM25(corpus, {
      ...DEFAULT_CONFIG,
      worker: true,
      min_docs_for_worker: 2,
      filter_threshold: 0.1,
    });

    expect(workerResult).toEqual(syncResult);
    expect(workerResult['doc-a']).toContain('doc-b');
    expect(workerResult['doc-a']).not.toContain('doc-c');
  });

  it('should fall back to synchronous execution when worker option is false', async () => {
    const result = await executeBM25(corpus, {
      ...DEFAULT_CONFIG,
      worker: false,
    });
    expect(result).toBeDefined();
    expect(result['doc-a']).toContain('doc-b');
  });
});
