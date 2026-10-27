import type { RawDoc, ResolvedConfig } from './types.js';
import { executeBM25 } from './worker.js';

export function extractTaxonomy(items: unknown): string[] {
  if (!items) return [];

  if (Array.isArray(items)) {
    return items
      .map((item) => (typeof item === 'object' && item && 'name' in item ? String(item.name) : String(item)))
      .filter(Boolean);
  }

  // Hexo Warehouse Collection support
  if (typeof items === 'object' && items !== null) {
    if ('toArray' in items && typeof (items as { toArray: () => unknown[] }).toArray === 'function') {
      return (items as { toArray: () => unknown[] })
        .toArray()
        .map((item) => (typeof item === 'object' && item && 'name' in item ? String(item.name) : String(item)))
        .filter(Boolean);
    }
    if ('data' in items && Array.isArray((items as { data: unknown[] }).data)) {
      return (items as { data: unknown[] }).data
        .map((item) => (typeof item === 'object' && item && 'name' in item ? String(item.name) : String(item)))
        .filter(Boolean);
    }
  }

  return [];
}

export class RelatedPostsEngine {
  private relatedCache: Record<string, string[]> | null = null;

  public clearCache(): void {
    this.relatedCache = null;
  }

  public getRelated(key: string): string[] | undefined {
    return this.relatedCache ? this.relatedCache[key] : undefined;
  }

  public getAllRelated(): Record<string, string[]> {
    return this.relatedCache || {};
  }

  public hasCache(): boolean {
    return this.relatedCache !== null;
  }

  public async compute(
    posts: Array<Record<string, any>>,
    config: ResolvedConfig
  ): Promise<Record<string, string[]>> {
    const publishedPosts = posts.filter((p) => p && p.published !== false);

    if (publishedPosts.length === 0) {
      this.relatedCache = Object.create(null) as Record<string, string[]>;
      return this.relatedCache;
    }

    const rawDocs: RawDoc[] = publishedPosts.map((post) => {
      let keywordsStr = '';
      if (Array.isArray(post.keywords)) {
        keywordsStr = post.keywords.map((k: any) => (typeof k === 'object' && k ? k.name || '' : String(k))).join(' ');
      } else if (post.keywords) {
        keywordsStr = String(post.keywords);
      }

      return {
        id: String(post._id || post.id || post.path),
        path: String(post.path || ''),
        title: String(post.title || ''),
        content: String(post.content || post.raw || ''),
        description: post.description || post.intro ? String(post.description || post.intro) : undefined,
        keywords: keywordsStr || undefined,
        tags: extractTaxonomy(post.tags),
        categories: extractTaxonomy(post.categories),
      };
    });

    const relatedMap = await executeBM25(rawDocs, config);

    const pathMap = new Map<string, string>(rawDocs.map((d) => [d.id, d.path]));
    const cache: Record<string, string[]> = Object.create(null);

    for (const [id, relatedIds] of Object.entries(relatedMap)) {
      const matchedPaths = relatedIds
        .map((rid) => pathMap.get(rid))
        .filter((p): p is string => Boolean(p));

      cache[id] = matchedPaths;
      const postPath = pathMap.get(id);
      if (postPath) {
        cache[postPath] = matchedPaths;
      }
    }

    // Attach to post objects directly
    for (const post of publishedPosts) {
      const key = String(post._id || post.id || post.path);
      const matched = cache[key] || [];
      try {
        post.related_posts = matched;
      } catch {
        // Safe ignore if object is read-only
      }
    }

    this.relatedCache = cache;
    return cache;
  }
}
