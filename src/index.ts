import { registerPlugin } from './plugin.js';

export * from './types.js';
export * from './stopwords.js';
export * from './config.js';
export * from './tokenizer.js';
export * from './bm25.js';
export * from './worker.js';
export * from './engine.js';
export * from './plugin.js';

export default function hexoRelatedPosts(hexoInstance?: any): any {
  const ctx = hexoInstance || (typeof globalThis !== 'undefined' ? (globalThis as any).hexo : undefined);
  if (ctx) {
    return registerPlugin(ctx);
  }
  return undefined;
}

// Auto-register if global hexo instance exists
if (typeof globalThis !== 'undefined' && (globalThis as any).hexo) {
  registerPlugin((globalThis as any).hexo);
}
