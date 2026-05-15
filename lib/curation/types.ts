export type Role = 'manager' | 'developer' | 'sre' | 'pm';

export const ROLES: Role[] = ['manager', 'developer', 'sre', 'pm'];

export const ROLE_LABELS: Record<Role, string> = {
  manager: 'Managers',
  developer: 'Devs',
  sre: 'SREs',
  pm: 'PMs',
};

export type ProductChannel =
  | 'power-query'
  | 'dataflows'
  | 'fabric'
  | 'data-factory'
  | 'onelake'
  | 'pipelines'
  | 'hdinsight'
  | 'service-assist'
  | 'power-bi'
  | 'data-lake'
  | 'synapse'
  | 'azure'
  | 'azure-gov'
  | 'ai'
  | 'humor';

export const PRODUCT_LABELS: Record<ProductChannel, string> = {
  'power-query': 'Power Query / PQO',
  dataflows: 'Dataflows (Gen1/Gen2)',
  fabric: 'Microsoft Fabric',
  'data-factory': 'Data Factory',
  onelake: 'OneLake',
  pipelines: 'Pipelines / Eventstreams',
  hdinsight: 'HDInsight',
  'service-assist': 'Service Assist',
  'power-bi': 'Power BI',
  'data-lake': 'Azure Data Lake',
  synapse: 'Synapse',
  azure: 'Azure (general)',
  'azure-gov': 'Azure Government',
  ai: 'AI / ML / LLMs',
  humor: 'Fun / Humor',
};

export const ALL_PRODUCTS: ProductChannel[] = Object.keys(
  PRODUCT_LABELS,
) as ProductChannel[];

export type SourceId = 'bbc' | 'nyt' | 'guardian' | 'hn' | 'reddit';

export const SOURCE_LABELS: Record<SourceId, string> = {
  bbc: 'BBC',
  nyt: 'NYT',
  guardian: 'Guardian',
  hn: 'Hacker News',
  reddit: 'Reddit',
};

export interface RawArticle {
  id: string;
  source: SourceId;
  subSource?: string; // subreddit name, RSS feed name, etc.
  title: string;
  url: string;
  summary?: string;
  publishedAt: string; // ISO
  engagement?: number; // HN points or Reddit ups
  commentsUrl?: string;
}

export interface ScoredArticle extends RawArticle {
  score: number;
  roles: Role[];
  products: ProductChannel[];
  scoreBreakdown: {
    role: number;
    product: number;
    source: number;
    recency: number;
    engagement: number;
    noise: number;
  };
}

export interface FeedFile {
  generatedAt: string;
  count: number;
  articles: ScoredArticle[];
}
