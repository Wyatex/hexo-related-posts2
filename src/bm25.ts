import type { BM25DocVector, DocTokens, RawDoc, RelatedPostResult, ResolvedConfig } from './types.js';
import { buildStopWordSet } from './stopwords.js';
import { tokenize } from './tokenizer.js';

export function calculateBM25(docs: RawDoc[], config: ResolvedConfig): RelatedPostResult {
  const result: RelatedPostResult = {};
  const N = docs.length;

  if (N === 0) {
    return result;
  }

  if (N === 1) {
    result[docs[0]!.id] = [];
    return result;
  }

  const stopWords = buildStopWordSet(config.stop_words);
  const tokenizeOpts = {
    locale: config.locale,
    reserved: config.reserved,
    stopWords,
  };

  const weights = config.weight;
  const docTokens: DocTokens[] = [];
  const df = new Map<string, number>();
  let totalLength = 0;

  // 1. Tokenize & accumulate term frequencies
  for (const doc of docs) {
    const tf = new Map<string, number>();

    const addWord = (w: string, weight: number): void => {
      tf.set(w, (tf.get(w) || 0) + weight);
    };

    const contentWords = tokenize(doc.content, tokenizeOpts);
    const titleWords = tokenize(doc.title, tokenizeOpts);
    const descWords = doc.description ? tokenize(doc.description, tokenizeOpts) : [];
    const kwWords = doc.keywords ? tokenize(doc.keywords, tokenizeOpts) : [];

    contentWords.forEach((w) => addWord(w, weights.text));
    titleWords.forEach((w) => addWord(w, weights.title));
    descWords.forEach((w) => addWord(w, weights.description));
    kwWords.forEach((w) => addWord(w, weights.keywords));

    // Tag features directly injected with tag weight
    if (doc.tags && doc.tags.length > 0) {
      for (const t of doc.tags) {
        const normalizedTag = `tag:${t.trim().toLowerCase()}`;
        addWord(normalizedTag, weights.tags);
      }
    }

    const docLen = Math.max(
      contentWords.length * weights.text +
        titleWords.length * weights.title +
        descWords.length * weights.description +
        kwWords.length * weights.keywords +
        (doc.tags?.length || 0) * weights.tags,
      1
    );

    totalLength += docLen;

    for (const word of tf.keys()) {
      df.set(word, (df.get(word) || 0) + 1);
    }

    docTokens.push({
      id: doc.id,
      tf,
      len: docLen,
      tags: new Set((doc.tags || []).map((t) => t.trim().toLowerCase())),
      categories: new Set((doc.categories || []).map((c) => c.trim().toLowerCase())),
    });
  }

  // 2. BM25 weight vector calculation
  const avgdl = totalLength / N;
  const k1 = 1.5;
  const b = 0.75;

  const docVectors: BM25DocVector[] = docTokens.map((doc) => {
    const vec = new Map<string, number>();
    let normSq = 0;

    for (const [word, freq] of doc.tf.entries()) {
      const docFreq = df.get(word) || 0;
      // Robertson-Spärck Jones BM25 IDF formula
      const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
      // Standard BM25 TF saturation
      const tfSaturation =
        (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * (doc.len / avgdl)));
      const weight = idf * tfSaturation;

      vec.set(word, weight);
      normSq += weight * weight;
    }

    return {
      ...doc,
      vec,
      norm: Math.sqrt(normSq),
    };
  });

  // 3. Multi-dimensional similarity scoring
  const catWeightRatio = Math.min(Math.max(weights.categories, 0), 0.5);

  for (let i = 0; i < N; i++) {
    const docA = docVectors[i]!;
    const scores: Array<{ id: string; score: number }> = [];

    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const docB = docVectors[j]!;

      // A. Cosine similarity of BM25 sparse vectors
      let dotProduct = 0;
      const [shorter, longer] =
        docA.vec.size < docB.vec.size ? [docA.vec, docB.vec] : [docB.vec, docA.vec];

      for (const [word, weightA] of shorter.entries()) {
        const weightB = longer.get(word);
        if (weightB !== undefined) {
          dotProduct += weightA * weightB;
        }
      }

      const bm25Sim =
        docA.norm > 0 && docB.norm > 0 ? dotProduct / (docA.norm * docB.norm) : 0;

      // B. Category overlap score
      let catMatch = 0;
      for (const c of docA.categories) {
        if (docB.categories.has(c)) {
          catMatch++;
        }
      }
      const catScore = catMatch > 0 ? 1 : 0;

      // C. Blended final score
      const finalScore = bm25Sim * (1 - catWeightRatio) + catScore * catWeightRatio;

      if (finalScore >= config.filter_threshold) {
        scores.push({ id: docB.id, score: finalScore });
      }
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);
    result[docA.id] = scores.slice(0, config.related_count).map((s) => s.id);
  }

  return result;
}
