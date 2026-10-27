import { isEnvironmentEnabled, resolveConfig } from './config.js';
import { RelatedPostsEngine } from './engine.js';
import type { ResolvedConfig } from './types.js';

export function registerPlugin(hexo: any): RelatedPostsEngine | undefined {
  if (!hexo || !hexo.extend || !hexo.extend.filter) {
    return undefined;
  }

  // Prevent duplicate registration
  if (hexo.__hexo_related_posts_engine) {
    return hexo.__hexo_related_posts_engine;
  }

  const getEffectiveConfig = (): ResolvedConfig => {
    const raw =
      (hexo.config && hexo.config.related_posts) ||
      (hexo.theme && hexo.theme.config && hexo.theme.config.related_posts) ||
      undefined;
    const resolved = resolveConfig(raw);
    // Ensure hexo.config has it so theme templates / css (hexo-config('related_posts...')) see it
    if (hexo.config) {
      hexo.config.related_posts = resolved;
    }
    return resolved;
  };

  const initialConfig = getEffectiveConfig();
  const rawProvidedConfig =
    (hexo.config && hexo.config.related_posts) ||
    (hexo.theme && hexo.theme.config && hexo.theme.config.related_posts);

  const isInitialEnvEnabled = isEnvironmentEnabled(
    initialConfig.enable_env_name,
    hexo.env && hexo.env.args ? hexo.env.args : undefined
  );

  if (rawProvidedConfig && (!initialConfig.enable || !isInitialEnvEnabled)) {
    if (hexo.log && typeof hexo.log.debug === 'function') {
      hexo.log.debug('[hexo-related-posts2] Plugin execution skipped (disabled by config or environment).');
    }
    return undefined;
  }

  const engine = new RelatedPostsEngine();
  hexo.__hexo_related_posts_engine = engine;

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
    const resolvedConfig = getEffectiveConfig();

    const isEnvEnabled = isEnvironmentEnabled(
      resolvedConfig.enable_env_name,
      hexo.env && hexo.env.args ? hexo.env.args : undefined
    );

    if (!resolvedConfig.enable || !isEnvEnabled) {
      if (hexo.log && typeof hexo.log.debug === 'function') {
        hexo.log.debug('[hexo-related-posts2] Skipped (disabled by config or environment).');
      }
      return;
    }

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
