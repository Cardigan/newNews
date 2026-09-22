import type { RawArticle } from './types';

const SENSITIVE_QUERY_PARAM =
  /^(?:sig|signature|token|access[_-]?token|auth[_-]?token|share[_-]?token|api[_-]?key|secret|password|credential|x-amz-.+|x-goog-.+)$/i;

const SENSITIVE_QUERY_VALUE =
  /((?:[?&]|&amp;)(?:sig|signature|token|access[_-]?token|auth[_-]?token|share[_-]?token|api[_-]?key|secret|password|credential|x-amz-[a-z0-9-]+|x-goog-[a-z0-9-]+)=)[^&#\s"'<>]+/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PRIVATE_IPV4 =
  /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g;
const PRIVATE_HOSTNAME =
  /\b[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.(?:corp|internal|intranet|lan|local)\b/gi;
const CLOUD_RESOURCE_HOSTNAME =
  /\b[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.(?:database\.windows\.net|(?:file|blob|dfs)\.core\.windows\.net|vault\.azure\.net|azurewebsites\.net|cognitiveservices\.azure\.com)\b/gi;
const GUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

export function sanitizeText(value: string): string {
  return value
    .replace(SENSITIVE_QUERY_VALUE, '$1[redacted]')
    .replace(EMAIL, '[redacted email]')
    .replace(PRIVATE_IPV4, '[redacted private IP]')
    .replace(PRIVATE_HOSTNAME, '[redacted internal hostname]')
    .replace(CLOUD_RESOURCE_HOSTNAME, '[redacted cloud hostname]')
    .replace(GUID, '[redacted identifier]');
}

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PARAM.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return sanitizeText(value);
  }
}

export function sanitizeArticle(article: RawArticle): RawArticle {
  const userGenerated = article.source === 'hn' || article.source === 'reddit';

  return {
    ...article,
    title: sanitizeText(article.title),
    url: sanitizeUrl(article.url),
    summary: userGenerated
      ? undefined
      : article.summary
        ? sanitizeText(article.summary)
        : article.summary,
    commentsUrl: article.commentsUrl
      ? sanitizeUrl(article.commentsUrl)
      : article.commentsUrl,
  };
}
