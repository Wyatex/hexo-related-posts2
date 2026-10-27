import { registerPlugin } from './plugin.js';

export * from './types.js';
export * from './stopwords.js';
export * from './config.js';
export * from './tokenizer.js';
export * from './bm25.js';
export * from './worker.js';
export * from './engine.js';
export * from './plugin.js';

declare const hexo: any;

export default function hexoRelatedPosts(hexoInstance?: any): any {
  const ctx =
    hexoInstance ||
    (typeof hexo !== 'undefined' ? hexo : undefined) ||
    (typeof globalThis !== 'undefined' ? (globalThis as any).hexo : undefined);
  if (ctx) {
    return registerPlugin(ctx);
  }
  return undefined;
}

// Auto-register when loaded by Hexo's plugin loader
const autoCtx =
  (typeof hexo !== 'undefined' ? hexo : undefined) ||
  (typeof globalThis !== 'undefined' ? (globalThis as any).hexo : undefined);

if (autoCtx && autoCtx.extend && autoCtx.extend.filter) {
  registerPlugin(autoCtx);
}
