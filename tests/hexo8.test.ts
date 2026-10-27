import { describe, expect, it } from 'vitest';
import Hexo8 from 'hexo';
import { registerPlugin } from '../src/plugin.js';

describe('Hexo 8 Integration Specification (SDD)', () => {
  it('should calculate related posts and inject into template locals in Hexo 8', async () => {
    const hexo = new Hexo8(process.cwd(), { silent: true });
    await hexo.init();

    hexo.config.related_posts = {
      enable: true,
      filter_threshold: 0.1,
      related_count: 5,
      worker: false,
    };

    const engine = registerPlugin(hexo);
    expect(engine).toBeDefined();

    const Post = hexo.model('Post');

    const post1 = await Post.insert({
      source: 'rust-async.md',
      slug: 'rust-async',
      title: 'Rust 异步编程与 Tokio 运行时底层机制剖析',
      content: '深入探讨 Rust Future 状态机、Poll 模式、Waker 唤醒机制以及 Tokio 任务调度的多线程设计。',
      published: true,
    });
    await post1.setTags(['Rust', '系统编程', '异步并发']);
    await post1.setCategories(['后端开发']);

    const post2 = await Post.insert({
      source: 'rust-memory.md',
      slug: 'rust-memory',
      title: 'Rust 所有权与生命周期完全指南',
      content: '理解 Rust 内存安全的核心：所有权、借用检查器（Borrow Checker）与静态生命周期注解。',
      published: true,
    });
    await post2.setTags(['Rust', '内存安全', '系统编程']);
    await post2.setCategories(['后端开发']);

    const post3 = await Post.insert({
      source: 'tokyo-travel.md',
      slug: 'tokyo-travel',
      title: '日本东京自由行赏樱攻略与景点推荐',
      content: '浅草寺、上野公园、新宿御苑是春季赏樱的经典路线，推荐购买地铁三日通票畅游都心。',
      published: true,
    });
    await post3.setTags(['旅游', '日本']);
    await post3.setCategories(['旅行游记']);

    // Trigger Hexo before_generate filter
    await hexo.extend.filter.exec('before_generate', undefined, { context: hexo });

    // Validate that post1 is related to post2
    expect(post1.related_posts).toBeDefined();
    expect(post1.related_posts).toContain(post2.path);
    expect(post1.related_posts).not.toContain(post3.path);

    // Validate template_locals filter injection
    const locals = await hexo.extend.filter.exec(
      'template_locals',
      { page: { _id: post1._id, path: post1.path }, path: post1.path },
      { context: hexo }
    );

    expect(locals.page.related_posts).toBeDefined();
    expect(locals.page.related_posts).toContain(post2.path);
    expect(locals.page.related_posts).not.toContain(post3.path);
  });

  it('should support worker thread calculation in Hexo 8', async () => {
    const hexo = new Hexo8(process.cwd(), { silent: true });
    await hexo.init();

    hexo.config.related_posts = {
      enable: true,
      filter_threshold: 0.1,
      related_count: 3,
      worker: true,
      min_docs_for_worker: 2,
    };

    const engine = registerPlugin(hexo);
    expect(engine).toBeDefined();

    const Post = hexo.model('Post');

    const post1 = await Post.insert({
      source: 'ai-transformer.md',
      slug: 'ai-transformer',
      title: 'Transformer 与自注意力机制架构详解',
      content: 'Transformer 依靠 Self-Attention 机制彻底革新了自然语言处理大模型。',
      published: true,
    });
    await post1.setTags(['AI', 'NLP', '深度学习']);
    await post1.setCategories(['人工智能']);

    const post2 = await Post.insert({
      source: 'ai-llm-rag.md',
      slug: 'ai-llm-rag',
      title: '大语言模型 RAG 检索增强生成架构实践',
      content: '结合向量数据库与深度学习检索技术增强 LLM 问答准确度。',
      published: true,
    });
    await post2.setTags(['AI', 'LLM', '深度学习']);
    await post2.setCategories(['人工智能']);

    const post3 = await Post.insert({
      source: 'coffee-roast.md',
      slug: 'coffee-roast',
      title: '手冲咖啡豆烘焙风味曲线解析',
      content: '浅度烘焙保留花果香气，中深度烘焙展现焦糖与坚果醇厚风味。',
      published: true,
    });
    await post3.setTags(['美食', '咖啡']);
    await post3.setCategories(['生活杂记']);

    await hexo.extend.filter.exec('before_generate', undefined, { context: hexo });

    expect(post1.related_posts).toContain(post2.path);
  });
});
