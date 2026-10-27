import type { RelatedPostsConfig, ResolvedConfig, WeightConfig } from './types.js';

export const DEFAULT_WEIGHTS: WeightConfig = {
  title: 5,
  description: 2,
  keywords: 3,
  tags: 5,
  categories: 0.2,
  text: 1,
};

export const DEFAULT_CONFIG: ResolvedConfig = {
  enable: true,
  enable_env_name: undefined,
  filter_threshold: 0.2,
  related_count: 5,
  weight: DEFAULT_WEIGHTS,
  reserved: [],
  locale: 'zh-CN',
  worker: true,
  min_docs_for_worker: 5,
  stop_words: [],
};

export function resolveConfig(userConfig?: RelatedPostsConfig): ResolvedConfig {
  if (!userConfig) {
    return { ...DEFAULT_CONFIG, weight: { ...DEFAULT_WEIGHTS } };
  }

  const isEnabled =
    userConfig.enable !== undefined
      ? Boolean(userConfig.enable)
      : userConfig.enabled !== undefined
        ? Boolean(userConfig.enabled)
        : true;

  // Resolve locale from locale or legacy stemmers
  let locale = userConfig.locale || DEFAULT_CONFIG.locale;
  if (!userConfig.locale && Array.isArray(userConfig.stemmers) && userConfig.stemmers.length > 0) {
    const firstStemmer = userConfig.stemmers[0]?.toLowerCase();
    if (firstStemmer === 'zh' || firstStemmer === 'cn' || firstStemmer === 'zh-cn') {
      locale = 'zh-CN';
    } else if (firstStemmer === 'en') {
      locale = 'en-US';
    } else if (firstStemmer === 'ja' || firstStemmer === 'jp') {
      locale = 'ja-JP';
    } else if (firstStemmer) {
      locale = firstStemmer;
    }
  }

  // Merge weights
  let userWeights: WeightConfig = {
    ...DEFAULT_WEIGHTS,
    ...(userConfig.weight || {}),
  };

  // Legacy weight translation: if user explicitly provided legacy-style fraction weights (e.g. title: 0.05, text: 1)
  if (
    userConfig.weight &&
    typeof userConfig.weight.title === 'number' &&
    userConfig.weight.title > 0 &&
    userConfig.weight.title <= 0.1 &&
    (!userConfig.weight.text || userConfig.weight.text === 1)
  ) {
    userWeights = {
      title: (userConfig.weight.title || 0.05) * 100,
      description: (userConfig.weight.description || 0.05) * 40,
      keywords: (userConfig.weight.keywords || 0.01) * 300,
      tags: (userConfig.weight.tags || 0.005) * 1000,
      categories: (userConfig.weight.categories || 0.005) * 40,
      text: userConfig.weight.text || 1,
    };
  }

  return {
    enable: isEnabled,
    enable_env_name: userConfig.enable_env_name || undefined,
    filter_threshold:
      typeof userConfig.filter_threshold === 'number'
        ? userConfig.filter_threshold
        : DEFAULT_CONFIG.filter_threshold,
    related_count:
      typeof userConfig.related_count === 'number' && userConfig.related_count > 0
        ? userConfig.related_count
        : DEFAULT_CONFIG.related_count,
    weight: userWeights,
    reserved: Array.isArray(userConfig.reserved) ? userConfig.reserved : [],
    locale,
    worker: userConfig.worker !== false,
    min_docs_for_worker:
      typeof userConfig.min_docs_for_worker === 'number'
        ? userConfig.min_docs_for_worker
        : DEFAULT_CONFIG.min_docs_for_worker,
    stop_words: Array.isArray(userConfig.stop_words) ? userConfig.stop_words : [],
  };
}

export function isEnvironmentEnabled(
  enableEnvName: string | undefined,
  hexoEnvArgs?: Record<string, unknown>
): boolean {
  if (!enableEnvName) {
    return true;
  }

  if (hexoEnvArgs && hexoEnvArgs[enableEnvName]) {
    return true;
  }

  const envValue = process.env.HEXO_ENV || process.env.NODE_ENV;
  if (envValue && envValue.toLowerCase() === enableEnvName.toLowerCase()) {
    return true;
  }

  // Check if CLI flags contain --<enableEnvName>
  return process.argv.includes(`--${enableEnvName}`);
}
