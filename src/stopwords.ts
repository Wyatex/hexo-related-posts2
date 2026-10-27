export const DEFAULT_STOP_WORDS: ReadonlySet<string> = new Set<string>([
  // Chinese high frequency stop words
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '与', '及', '等', '其', '他', '她', '它', '们', '个', '对',
  '从', '把', '被', '让', '此', '但', '而', '或', '所', '由', '向', '更', '后',
  '前', '又', '把', '给', '过', '得', '着', '已', '因', '并', '最', '以', '之',
  // English common stop words
  'the', 'a', 'an', 'to', 'in', 'is', 'it', 'of', 'and', 'for', 'on', 'with',
  'as', 'at', 'by', 'this', 'that', 'from', 'or', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'not',
  'if', 'then', 'else', 'when', 'up', 'out', 'so', 'no', 'can', 'will', 'all',
  'any', 'we', 'they', 'you', 'he', 'she', 'my', 'your', 'his', 'her', 'its',
  'our', 'their', 'which', 'who', 'whom', 'whose', 'what', 'where', 'why', 'how',
]);

export function buildStopWordSet(customWords?: string[]): Set<string> {
  const set = new Set<string>(DEFAULT_STOP_WORDS);
  if (customWords && Array.isArray(customWords)) {
    for (const word of customWords) {
      const trimmed = word.trim().toLowerCase();
      if (trimmed) {
        set.add(trimmed);
      }
    }
  }
  return set;
}
