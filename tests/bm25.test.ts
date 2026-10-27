import { describe, expect, it } from 'vitest';
import { calculateBM25 } from '../src/bm25.js';
import { DEFAULT_CONFIG } from '../src/config.js';
import type { RawDoc } from '../src/types.js';

describe('BM25 Mathematical Model Specification (SDD)', () => {
  const sampleDocs: RawDoc[] = [
    {
      id: 'doc-1',
      path: 'posts/vue-reactivity/',
      title: 'Vue 3 响应式原理深度剖析与源码解读',
      content: 'Vue3 采用 Proxy 替代 Object.defineProperty 实现响应式系统，提供 reactive, ref, effect 等核心 API，极大地提升了大型应用的渲染性能。',
      tags: ['Vue', '前端', 'JavaScript'],
      categories: ['前端工程'],
    },
    {
      id: 'doc-2',
      path: 'posts/vue-pinia/',
      title: 'Pinia 状态管理在 Vue 3 项目中的最佳架构实践',
      content: 'Pinia 是 Vue 官方推荐的新一代状态管理库，完全支持 TypeScript 和 Composition API，取代了过去的 Vuex，并具有极佳的代码提示与模块化能力。',
      tags: ['Vue', 'Pinia', '前端'],
      categories: ['前端工程'],
    },
    {
      id: 'doc-3',
      path: 'posts/gardening-tips/',
      title: '家庭阳台绿植盆栽养护技巧与浇水指南',
      content: '室内绿植需要合理的光照与水分控制。虎皮兰、绿萝、龟背竹等耐阴植物在春季需要注意防止积水烂根，适量施加有机肥料有助于叶片常绿。',
      tags: ['生活', '绿植'],
      categories: ['园艺生活'],
    },
    {
      id: 'doc-4',
      path: 'posts/frontend-performance/',
      title: '前端性能优化全景指南：从网络层到页面渲染',
      content: '前端性能优化涉及 HTTP/2、代码分割、Tree Shaking、虚拟列表、图片懒加载以及前端框架渲染优化，包括 React 与 Vue 的组件级更新策略。',
      tags: ['前端', '性能优化', 'Vue'],
      categories: ['前端工程'],
    },
  ];

  it('should recommend related frontend posts for Vue 3 Reactivity', () => {
    const result = calculateBM25(sampleDocs, {
      ...DEFAULT_CONFIG,
      related_count: 2,
      filter_threshold: 0.1,
    });

    const relatedToDoc1 = result['doc-1'];
    expect(relatedToDoc1).toBeDefined();
    expect(relatedToDoc1!.length).toBeGreaterThan(0);
    // Pinia (doc-2) or Performance (doc-4) should be related, gardening (doc-3) should NOT be top related
    expect(relatedToDoc1).toContain('doc-2');
    expect(relatedToDoc1).not.toContain('doc-3');
  });

  it('should not recommend unrelated posts if score is below threshold', () => {
    const result = calculateBM25(sampleDocs, {
      ...DEFAULT_CONFIG,
      related_count: 5,
      filter_threshold: 0.3,
    });

    // Gardening doc-3 should have very few or 0 related posts
    const relatedToDoc3 = result['doc-3'] || [];
    expect(relatedToDoc3).not.toContain('doc-1');
  });

  it('should limit result to related_count', () => {
    const result = calculateBM25(sampleDocs, {
      ...DEFAULT_CONFIG,
      related_count: 1,
      filter_threshold: 0.01,
    });

    for (const ids of Object.values(result)) {
      expect(ids.length).toBeLessThanOrEqual(1);
    }
  });

  it('should handle empty or single document edge cases', () => {
    expect(calculateBM25([], DEFAULT_CONFIG)).toEqual({});
    expect(calculateBM25([sampleDocs[0]!], DEFAULT_CONFIG)).toEqual({ 'doc-1': [] });
  });
});
