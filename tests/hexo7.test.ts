import { describe, expect, it } from 'vitest';
import Hexo7 from 'hexo-7';
import { registerPlugin } from '../src/plugin.js';

describe('Hexo 7 Integration Specification (SDD)', () => {
  it('should calculate related posts and inject into template locals in Hexo 7', async () => {
    const hexo = new Hexo7(process.cwd(), { silent: true });
    await hexo.init();

    hexo.config.related_posts = {
      enable: true,
      filter_threshold: 0.1,
      related_count: 5,
      worker: false, // sync for deterministic test execution
    };

    const engine = registerPlugin(hexo);
    expect(engine).toBeDefined();

    const Post = hexo.model('Post');

    const post1 = await Post.insert({
      source: 'docker-k8s.md',
      slug: 'docker-k8s',
      title: 'Docker 容器化与 Kubernetes 进阶编排指南',
      content: '本文详细介绍 Dockerfile 多阶段构建技巧以及 Kubernetes Pod、Deployment 与 Service 网络通信机制。',
      published: true,
    });
    await post1.setTags(['Docker', 'Kubernetes', 'DevOps']);
    await post1.setCategories(['云计算与容器']);

    const post2 = await Post.insert({
      source: 'k8s-service-mesh.md',
      slug: 'k8s-service-mesh',
      title: 'Kubernetes 服务网格 Istio 流量治理实践',
      content: '基于 Kubernetes 和 Istio 实现微服务的灰度发布、金丝雀发布、熔断与分布式链路追踪方案。',
      published: true,
    });
    await post2.setTags(['Kubernetes', 'Istio', 'DevOps']);
    await post2.setCategories(['云计算与容器']);

    const post3 = await Post.insert({
      source: 'sourdough-bread.md',
      slug: 'sourdough-bread',
      title: '传统天然酵母酸种欧包制作与烘焙技巧',
      content: '制作高质量酸面团欧包的关键在于天然酵母的水合比、面筋延展性与铸铁锅高温烘烤蒸汽。',
      published: true,
    });
    await post3.setTags(['烘焙', '美食']);
    await post3.setCategories(['美食生活']);

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

  it('should skip execution when disabled in Hexo 7', async () => {
    const hexo = new Hexo7(process.cwd(), { silent: true });
    await hexo.init();

    hexo.config.related_posts = {
      enable: false,
    };

    const engine = registerPlugin(hexo);
    expect(engine).toBeUndefined();
  });
});
