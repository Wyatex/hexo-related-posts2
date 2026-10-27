import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, DEFAULT_WEIGHTS, isEnvironmentEnabled, resolveConfig } from '../src/config.js';

describe('Configuration Specification (SDD)', () => {
  it('should return default configuration when undefined is passed', () => {
    const config = resolveConfig();
    expect(config.enable).toBe(true);
    expect(config.filter_threshold).toBe(0.2);
    expect(config.related_count).toBe(5);
    expect(config.worker).toBe(true);
    expect(config.locale).toBe('zh-CN');
    expect(config.weight).toEqual(DEFAULT_WEIGHTS);
    expect(config.reserved).toEqual([]);
    expect(config.stop_words).toEqual([]);
  });

  it('should handle enable and enabled aliases correctly', () => {
    expect(resolveConfig({ enable: false }).enable).toBe(false);
    expect(resolveConfig({ enabled: false }).enable).toBe(false);
    expect(resolveConfig({ enable: true, enabled: false }).enable).toBe(true);
  });

  it('should properly merge user-defined weights', () => {
    const config = resolveConfig({
      weight: {
        title: 10,
        text: 2,
      },
    });
    expect(config.weight.title).toBe(10);
    expect(config.weight.text).toBe(2);
    expect(config.weight.description).toBe(DEFAULT_WEIGHTS.description);
  });

  it('should translate legacy hexo-related-posts fraction weights', () => {
    const legacyConfig = resolveConfig({
      weight: {
        title: 0.05,
        description: 0.05,
        keywords: 0.01,
        tags: 0.005,
        categories: 0.005,
        text: 1,
      },
    });
    expect(legacyConfig.weight.title).toBe(5);
    expect(legacyConfig.weight.description).toBe(2);
    expect(legacyConfig.weight.keywords).toBe(3);
    expect(legacyConfig.weight.tags).toBe(5);
    expect(legacyConfig.weight.categories).toBe(0.2);
    expect(legacyConfig.weight.text).toBe(1);
  });

  it('should map legacy stemmers to appropriate locale', () => {
    expect(resolveConfig({ stemmers: ['en'] }).locale).toBe('en-US');
    expect(resolveConfig({ stemmers: ['jp'] }).locale).toBe('ja-JP');
    expect(resolveConfig({ stemmers: ['zh'] }).locale).toBe('zh-CN');
    expect(resolveConfig({ locale: 'fr-FR', stemmers: ['en'] }).locale).toBe('fr-FR');
  });

  it('should evaluate environment gating correctly', () => {
    expect(isEnvironmentEnabled(undefined)).toBe(true);
    expect(isEnvironmentEnabled('prod', { prod: true })).toBe(true);
    expect(isEnvironmentEnabled('prod', { prod: false })).toBe(false);
    expect(isEnvironmentEnabled('prod', {})).toBe(false);
  });
});
