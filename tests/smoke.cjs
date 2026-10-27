const assert = require('node:assert');
const { executeBM25, calculateBM25, tokenize, resolveConfig } = require('../dist/index.cjs');

async function runSmokeTest() {
  console.log(`Running runtime smoke test on Node.js ${process.version}...`);

  // 1. Test tokenization
  const tokens = tokenize('深入浅出TypeScript与Node.js多线程高并发架构设计与实践');
  assert(tokens.includes('typescript'), 'Should tokenize typescript');
  assert(tokens.includes('架构'), 'Should tokenize 架构');

  // 2. Test BM25 calculation
  const docs = [
    {
      id: 'doc-1',
      path: 'posts/vue-reactivity/',
      title: 'Vue 3 响应式原理深度剖析与源码解读',
      content: 'Vue3 采用 Proxy 替代 Object.defineProperty 实现响应式系统。',
      tags: ['Vue', '前端'],
      categories: ['前端工程'],
    },
    {
      id: 'doc-2',
      path: 'posts/vue-pinia/',
      title: 'Pinia 状态管理在 Vue 3 项目中的最佳架构实践',
      content: 'Pinia 是 Vue 官方推荐的新一代状态管理库。',
      tags: ['Vue', '前端'],
      categories: ['前端工程'],
    },
    {
      id: 'doc-3',
      path: 'posts/cooking-pasta/',
      title: '意式白酱通心粉烹饪技巧',
      content: '橄榄油热锅后加入大蒜爆香，倒入淡奶油小火搅拌。',
      tags: ['美食'],
      categories: ['生活'],
    },
  ];

  const config = resolveConfig({
    filter_threshold: 0.1,
    related_count: 5,
    min_docs_for_worker: 2,
    worker: true,
  });

  // Test synchronous
  const syncRes = calculateBM25(docs, config);
  assert(syncRes['doc-1'].includes('doc-2'), 'Sync: doc-1 should recommend doc-2');
  assert(!syncRes['doc-1'].includes('doc-3'), 'Sync: doc-1 should not recommend doc-3');

  // Test async / worker thread
  const workerRes = await executeBM25(docs, config);
  assert(workerRes['doc-1'].includes('doc-2'), 'Worker: doc-1 should recommend doc-2');
  assert(!workerRes['doc-1'].includes('doc-3'), 'Worker: doc-1 should not recommend doc-3');

  console.log(`✓ All smoke tests passed successfully on Node.js ${process.version}!`);
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
