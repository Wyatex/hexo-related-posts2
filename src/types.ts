export interface WeightConfig {
  title: number;
  description: number;
  keywords: number;
  tags: number;
  categories: number;
  text: number;
}

export interface RelatedPostsConfig {
  enable?: boolean;
  enabled?: boolean;
  enable_env_name?: string;
  filter_threshold?: number;
  related_count?: number;
  weight?: Partial<WeightConfig>;
  reserved?: string[];
  locale?: string;
  stemmers?: string[];
  worker?: boolean;
  min_docs_for_worker?: number;
  stop_words?: string[];
}

export interface ResolvedConfig {
  enable: boolean;
  enable_env_name: string | undefined;
  filter_threshold: number;
  related_count: number;
  weight: WeightConfig;
  reserved: string[];
  locale: string;
  worker: boolean;
  min_docs_for_worker: number;
  stop_words: string[];
}

export interface RawDoc {
  id: string;
  path: string;
  title: string;
  content: string;
  description?: string;
  keywords?: string;
  tags: string[];
  categories: string[];
}

export interface DocTokens {
  id: string;
  tf: Map<string, number>;
  len: number;
  tags: Set<string>;
  categories: Set<string>;
}

export interface BM25DocVector {
  id: string;
  tf: Map<string, number>;
  len: number;
  tags: Set<string>;
  categories: Set<string>;
  vec: Map<string, number>;
  norm: number;
}

export interface RelatedPostResult {
  [docId: string]: string[];
}

export interface WorkerInputPayload {
  docs: RawDoc[];
  config: ResolvedConfig;
}
