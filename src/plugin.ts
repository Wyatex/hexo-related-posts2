import { isEnvironmentEnabled, resolveConfig } from './config.js';
import { RelatedPostsEngine } from './engine.js';

export function registerPlugin(hexo: any): RelatedPostsEngine | undefined {
  if (!hexo || !hexo.extend || !hexo.extend.filter) {
    return undefined;
  }

  const rawConfig = hexo.config ? hexo.config.related_posts : undefined;
  const resolvedConfig = resolveConfig(rawConfig);

  // Store resolved config back to hexo.config for template / theme access
  if (hexo.config) {
    hexo.config.related_posts = resolvedConfig;
  }

  const isEnvEnabled = isEnvironmentEnabled(
    resolvedConfig.enable_env_name,
    hexo.env && hexo.env.args ? hexo.env.args : undefined
  );

  if (!resolvedConfig.enable || !isEnvEnabled) {
    if (hexo.log && typeof hexo.log.debug === 'function') {
      hexo.log.debug('[hexo-related-posts2] Plugin execution skipped (disabled by config or environment).');
    }
    return undefined;
  }

  const engine = new RelatedPostsEngine();

  // Attach dynamic getter to Hexo Post Document prototype so any Post instance accesses related_posts seamlessly
  try {
    const Post = typeof hexo.model === 'function' ? hexo.model('Post') : null;
    if (Post && Post.Document && Post.Document.prototype) {
      Object.defineProperty(Post.Document.prototype, 'related_posts', {
        get(this: any) {
          const key = String(this.path || this._id || this.id || '');
          return (key && engine.getRelated(key)) || [];
        },
        set(this: any, val: any) {
          Object.defineProperty(this, 'related_posts', {
            value: val,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch {
    // Graceful fallback if database schema is not extensible
  }

  // 1. Compute BM25 relations before generating files
  hexo.extend.filter.register('before_generate', async function (this: any) {
    if (this && this.locals && typeof this.locals.invalidate === 'function') {
      this.locals.invalidate();
    }

    const locals = this && this.locals ? this.locals : hexo.locals;
    const postsData = locals ? locals.get('posts') : null;
    if (!postsData) return;

    let posts: Array<Record<string, any>> = [];
    if (typeof postsData.toArray === 'function') {
      posts = postsData.toArray();
    } else if (Array.isArray(postsData.data)) {
      posts = postsData.data;
    } else if (Array.isArray(postsData)) {
      posts = postsData;
    } else if (postsData && Symbol.iterator in postsData) {
      posts = Array.from(postsData);
    }

    if (posts.length === 0) return;

    if (hexo.log && typeof hexo.log.info === 'function') {
      hexo.log.info(
        `[hexo-related-posts2] Calculating BM25 related posts for ${posts.length} posts (worker: ${resolvedConfig.worker})...`
      );
    }

    const cache = await engine.compute(posts, resolvedConfig);

    // Provide legacy hexo.related_posts compatibility
    hexo.related_posts = cache;

    if (hexo.log && typeof hexo.log.info === 'function') {
      hexo.log.info('[hexo-related-posts2] Related posts calculated successfully.');
    }
  });

  // 2. Inject into post render context
  hexo.extend.filter.register('before_post_render', function (data: any) {
    if (data) {
      const key = String(data.path || data._id || data.id || '');
      if (key && !data.related_posts) {
        data.related_posts = engine.getRelated(key) || [];
      }
    }
    return data;
  });

  // 3. Inject related_posts into template rendering locals
  hexo.extend.filter.register('template_locals', function (locals: any) {
    if (locals && locals.page) {
      const pageKey = String(locals.page.path || locals.page._id || locals.page.id || '');
      if (pageKey && !locals.page.related_posts) {
        locals.page.related_posts = engine.getRelated(pageKey) || [];
      }
    }
    return locals;
  });

  // 4. Clear cache on hexo clean
  hexo.extend.filter.register('after_clean', function () {
    engine.clearCache();
    hexo.related_posts = {};
  });

  return engine;
}
