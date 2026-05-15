import type { ProductChannel, Role } from './types';

// Maps a subreddit (lowercase) to product channels and/or roles that should
// be applied automatically to any post from that sub. This catches
// semantically relevant items that the keyword matcher would otherwise miss
// (e.g. an Iceberg post in r/MicrosoftFabric clearly relates to Fabric even
// if "fabric" isn't in the title).
export const SUBREDDIT_TAGS: Record<
  string,
  { products?: ProductChannel[]; roles?: Role[] }
> = {
  azure: { products: ['azure'] },
  azuregovernment: { products: ['azure-gov', 'azure'] },
  microsoftfabric: { products: ['fabric', 'onelake'] },
  powerbi: { products: ['power-bi'] },
  powerquery: { products: ['power-query', 'dataflows'] },
  dataengineering: { products: ['data-factory', 'dataflows', 'pipelines'] },
  dataflows: { products: ['dataflows'] },
  synapse: { products: ['synapse'] },
  databricks: { products: ['fabric'] }, // competitive context
  snowflake: { products: ['fabric'] },
  apachespark: { products: ['hdinsight'] },
  sre: { roles: ['sre'] },
  devops: { roles: ['sre', 'developer'] },
  kubernetes: { roles: ['sre', 'developer'] },
  programming: { roles: ['developer'] },
  machinelearning: { products: ['ai'], roles: ['developer'] },
  artificialintelligence: { products: ['ai'] },
  artificial: { products: ['ai'] },
  localllama: { products: ['ai'], roles: ['developer'] },
  openai: { products: ['ai'] },
  llm: { products: ['ai'] },
  programminghumor: { products: ['humor'], roles: ['developer'] },
  talesfromtechsupport: { products: ['humor'], roles: ['sre'] },
  sysadmin: { roles: ['sre'] },
};
