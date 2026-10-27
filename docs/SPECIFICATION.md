# Specification: hexo-related-posts2 (SDD)

## 1. System Overview

`hexo-related-posts2` is a high-performance recommendation plugin for Hexo (compatible with Hexo 7.x and Hexo 8.x). It replaces heavy, single-threaded, legacy NLP implementations with a modern BM25 sparse vector cosine similarity model running across background worker threads with zero runtime dependencies.

### 1.1 Core Principles
- **Specification-Driven**: Implementation rigorously implements this specification; behavior is tested against defined contracts.
- **Zero Runtime Dependencies**: Uses Node.js native features (`Intl.Segmenter`, `worker_threads`). No native C++ addons, no external dictionary files.
- **Multilingual Support**: First-class support for Chinese (CJK), English, and mixed multilingual texts out of the box.
- **Backward Compatibility**: Fully compatible with configuration parameters of legacy `hexo-related-posts` and output contracts expected by Hexo themes (e.g., NexT, Butterfly, Fluid).
- **Concurrency & Non-blocking**: Calculations run in Node.js `worker_threads`, keeping the main Hexo event loop responsive.

---

## 2. Configuration Schema Specification

### 2.1 Interface Definition

```typescript
export interface WeightConfig {
  title: number;       // default: 5 (or mapped from legacy 0.05)
  description: number; // default: 2 (or mapped from legacy 0.05)
  keywords: number;    // default: 3 (or mapped from legacy 0.01)
  tags: number;        // default: 5 (or mapped from legacy 0.05/0.005)
  categories: number;  // default: 0.2 (or mapped from legacy 0.05/0.005)
  text: number;        // default: 1
}

export interface RelatedPostsConfig {
  enable?: boolean;            // default: true
  enabled?: boolean;           // alias for enable
  enable_env_name?: string;    // optional: e.g. 'prod' to run only when `--prod` or HEXO_ENV=prod
  filter_threshold?: number;   // default: 0.2 (minimum score threshold)
  related_count?: number;      // default: 5 (top N count)
  weight?: Partial<WeightConfig>;
  reserved?: string[];         // words not to be split (e.g. ['ASP.NET', 'C++', 'Vue.js'])
  locale?: string;             // default: 'zh-CN' (Intl.Segmenter locale)
  stemmers?: string[];         // legacy compatibility option (mapped to locale if specified)
  worker?: boolean;            // default: true (enable worker_threads)
  min_docs_for_worker?: number;// default: 5 (run synchronously if docs count < min_docs_for_worker)
  stop_words?: string[];       // additional custom stop words
}
```

### 2.2 Default Values & Normalization

| Parameter | Type | Default | Description |
|:---|:---|:---|:---|
| `enable` / `enabled` | `boolean` | `true` | Master switch for plugin execution. |
| `enable_env_name` | `string \| undefined` | `undefined` | If set (e.g. `'prod'`), calculation executes only when `hexo.env.args[env]` or `process.env.HEXO_ENV` matches. |
| `filter_threshold` | `number` | `0.2` | Minimum similarity score (0.0 to 1.0) required to include a post in related results. |
| `related_count` | `number` | `5` | Maximum number of related posts to return per post. |
| `weight.title` | `number` | `5` | Relative token weight for post title terms. |
| `weight.description` | `number` | `2` | Relative token weight for post description terms. |
| `weight.keywords` | `number` | `3` | Relative token weight for post keywords. |
| `weight.tags` | `number` | `5` | Relative token weight for tag terms. |
| `weight.categories` | `number` | `0.2` | Relative weight for category overlap bonus. |
| `weight.text` | `number` | `1` | Relative token weight for main post content. |
| `reserved` | `string[]` | `[]` | Exact phrases / compound tokens to preserve intact. |
| `locale` | `string` | `'zh-CN'` | BCP 47 language tag passed to `Intl.Segmenter`. |
| `worker` | `boolean` | `true` | Whether to calculate pairwise similarities in a background Worker. |
| `stop_words` | `string[]` | `[]` | User-defined stop words extending default stop words. |

---

## 3. Text Normalization & Tokenization Specification

### 3.1 Pipeline
1. **HTML & Markdown Sanitization**: Strip all HTML tags (`<[^>]+>`) and markdown syntax (links, code blocks, images, headings).
2. **Reserved Words Extraction**: Identify occurrences of `config.reserved` case-insensitively, extract them as atomic tokens, and mask them from further splitting.
3. **Word Segmentation**:
   - Utilize native `Intl.Segmenter(locale, { granularity: 'word' })`.
   - Filter segments where `isWordLike === true` and trimmed length $> 1$.
   - Lowercase all extracted terms.
4. **Stop Words Exclusion**:
   - Filter terms against a unified stopword set containing high-frequency Chinese and English grammatical words.
   - Filter terms against user-provided `config.stop_words`.

---

## 4. Mathematical Model Specification

### 4.1 Document Frequency (DF) & Corpus Size
Let $N$ be the total number of published posts ($N \ge 1$).
For each term $w$, $DF(w)$ is the count of documents where $w$ occurs.

### 4.2 Inverse Document Frequency (Robertson-Spärck Jones IDF)
$$\text{IDF}(w) = \ln\left(1 + \frac{N - DF(w) + 0.5}{DF(w) + 0.5}\right)$$

### 4.3 BM25 Term Frequency Saturation
Let $|D|$ be the weighted length of document $D$, and $\text{avgdl} = \frac{1}{N}\sum |D|$:
$$\text{TF}_{\text{BM25}}(w, D) = \frac{\text{freq}(w, D) \cdot (k_1 + 1)}{\text{freq}(w, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$
Standard parameters: $k_1 = 1.5$, $b = 0.75$.

### 4.4 Term Weight & Vector Norm
$$\mathbf{v}_D(w) = \text{IDF}(w) \cdot \text{TF}_{\text{BM25}}(w, D)$$
$$\|\mathbf{v}_D\| = \sqrt{\sum_{w} \mathbf{v}_D(w)^2}$$

### 4.5 Cosine Similarity Between Document Vectors
$$\text{sim}_{\text{BM25}}(A, B) = \begin{cases} \frac{\sum_{w \in A \cap B} \mathbf{v}_A(w) \cdot \mathbf{v}_B(w)}{\|\mathbf{v}_A\| \cdot \|\mathbf{v}_B\|}, & \text{if } \|\mathbf{v}_A\| \cdot \|\mathbf{v}_B\| > 0 \\ 0, & \text{otherwise} \end{cases}$$

### 4.6 Category Overlap & Final Blended Score
Let $\text{catMatch}(A, B) = |C_A \cap C_B|$:
$$\text{catScore}(A, B) = \begin{cases} 1, & \text{if } \text{catMatch}(A, B) > 0 \\ 0, & \text{otherwise} \end{cases}$$
$$\text{Score}(A, B) = (1 - w_{\text{cat}}) \cdot \text{sim}_{\text{BM25}}(A, B) + w_{\text{cat}} \cdot \text{catScore}(A, B)$$
where $w_{\text{cat}} = \min(\text{config.weight.categories}, 0.5)$.

### 4.7 Post-Processing
For each document $A$:
1. Compute $\text{Score}(A, B)$ for all $B \ne A$.
2. Filter pairs where $\text{Score}(A, B) < \text{filter\_threshold}$.
3. Sort descending by $\text{Score}(A, B)$.
4. Select top `related_count` documents.

---

## 5. Concurrency & Worker Execution Specification

1. **TypeScript Worker Entry & tsdown Virtual Compilation**:
   - The worker runner logic is authored in pure TypeScript (`src/worker-runner.ts`) and directly imports `calculateBM25` from `src/bm25.ts`, ensuring 0% code duplication.
   - At build and test time, `tsdown`'s `Rolldown` API bundles `src/worker-runner.ts` and its dependency graph into a self-contained CJS string under `virtual:worker-code`.
   - The main worker coordinator (`src/worker.ts`) imports `workerCode from 'virtual:worker-code'` and executes it via `new Worker(workerCode, { eval: true })`.
   - This eliminates brittle relative filesystem path resolutions across differing package manager layouts (pnpm virtual store, monorepos, hoisted node_modules).
2. **Graceful Fallback**:
   - If `config.worker === false` or `docs.length < config.min_docs_for_worker`, run synchronously on the main thread.
   - If Worker thread initialization fails (e.g. sandboxed environment), seamlessly catch and fallback to synchronous computation.

---

## 6. Hexo Integration & Lifecycle Hooks

1. **`before_generate`**:
   - Execute before post and page generation.
   - Invalidate locals: `this.locals.invalidate()`.
   - Read published posts from `this.locals.get('posts')`.
   - Execute BM25 model (Worker or synchronous).
   - Populate cache: `relatedCache[post._id] = paths` and `relatedCache[post.path] = paths`.
   - Directly set `post.related_posts = paths` on post objects.
2. **`template_locals`**:
   - Hook into template rendering locals.
   - If `locals.page` exists and `!locals.page.related_posts`, inject `relatedCache[key] || []`.
   - Guarantees `page.related_posts` is available in all theme layouts (EJS, Nunjucks, Pug).
3. **`after_clean`**:
   - Clear cached results on `hexo clean`.

---

## 7. Compatibility Specification

- **Hexo 7.x**: `hexo@^7.0.0` - fully supported.
- **Hexo 8.x**: `hexo@^8.0.0` - fully supported.
- **Node.js**: `>=18.0.0` (Native `Intl.Segmenter` and `worker_threads`).
