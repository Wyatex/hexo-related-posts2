import { buildStopWordSet } from './stopwords.js';

export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]+`/g, ' ')
    // Remove markdown image syntax
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' ')
    // Convert markdown links [text](url) to text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Remove YAML frontmatter if present
    .replace(/^---[\s\S]*?---/g, ' ')
    // Normalize extra whitespaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(
  text: string,
  options: {
    locale?: string;
    reserved?: string[];
    stopWords?: Set<string>;
  } = {}
): string[] {
  const sanitized = sanitizeText(text);
  if (!sanitized) return [];

  const locale = options.locale || 'zh-CN';
  const stopWords = options.stopWords || buildStopWordSet();
  const reservedWords = options.reserved || [];

  const tokens: string[] = [];
  let remainingText = sanitized;

  // 1. Extract and preserve reserved words
  if (reservedWords.length > 0) {
    for (const reserved of reservedWords) {
      const trimmed = reserved.trim();
      if (!trimmed) continue;

      // Escape regex special chars
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const leftBoundary = /^\w/.test(trimmed) ? '(?<=^|[^a-zA-Z0-9_])' : '';
      const rightBoundary = /\w$/.test(trimmed) ? '(?=$|[^a-zA-Z0-9_])' : '';
      const regex = new RegExp(`${leftBoundary}${escaped}${rightBoundary}`, 'gi');

      let matchCount = 0;
      remainingText = remainingText.replace(regex, () => {
        matchCount++;
        return ' ';
      });

      const normalizedReserved = trimmed.toLowerCase();
      for (let i = 0; i < matchCount; i++) {
        tokens.push(normalizedReserved);
      }
    }
  }

  // 2. Tokenize with Intl.Segmenter
  let segmenter: Intl.Segmenter;
  try {
    segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  } catch {
    segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  }

  for (const { segment, isWordLike } of segmenter.segment(remainingText)) {
    const word = segment.trim().toLowerCase();
    if (isWordLike && word.length > 1 && !stopWords.has(word)) {
      tokens.push(word);
    }
  }

  return tokens;
}
