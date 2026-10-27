import { describe, expect, it } from 'vitest';
import hexoRelatedPosts, {
  DEFAULT_CONFIG,
  DEFAULT_STOP_WORDS,
  DEFAULT_WEIGHTS,
  RelatedPostsEngine,
  calculateBM25,
  executeBM25,
  registerPlugin,
  resolveConfig,
  sanitizeText,
  tokenize,
} from '../src/index.js';

describe('Public API Exports Specification (SDD)', () => {
  it('should export all essential functions, classes, and defaults', () => {
    expect(hexoRelatedPosts).toBeTypeOf('function');
    expect(registerPlugin).toBeTypeOf('function');
    expect(RelatedPostsEngine).toBeTypeOf('function');
    expect(calculateBM25).toBeTypeOf('function');
    expect(executeBM25).toBeTypeOf('function');
    expect(tokenize).toBeTypeOf('function');
    expect(sanitizeText).toBeTypeOf('function');
    expect(resolveConfig).toBeTypeOf('function');
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_WEIGHTS).toBeDefined();
    expect(DEFAULT_STOP_WORDS).toBeDefined();
  });
});
