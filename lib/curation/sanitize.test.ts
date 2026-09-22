import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { sanitizeArticle, sanitizeText, sanitizeUrl } from './sanitize';

test('sanitizeUrl removes access-bearing parameters and preserves normal ones', () => {
  const value = sanitizeUrl(
    'https://example.com/article?id=42&accessToken=secret&X-Amz-Signature=signed',
  );
  const url = new URL(value);

  assert.equal(url.searchParams.get('id'), '42');
  assert.equal(url.searchParams.has('accessToken'), false);
  assert.equal(url.searchParams.has('X-Amz-Signature'), false);
});

test('sanitizeText redacts common private identifiers', () => {
  const value = sanitizeText(
    'mail me@example.com from 10.2.3.4 via host.corp, db.database.windows.net, ' +
      'id 123e4567-e89b-42d3-a456-426614174000, and ?token=secret',
  );

  assert.equal(value.includes('me@example.com'), false);
  assert.equal(value.includes('10.2.3.4'), false);
  assert.equal(value.includes('host.corp'), false);
  assert.equal(value.includes('db.database.windows.net'), false);
  assert.equal(value.includes('123e4567-e89b-42d3-a456-426614174000'), false);
  assert.equal(value.includes('token=secret'), false);
});

test('sanitizeArticle drops untrusted user-generated summaries', () => {
  const article = sanitizeArticle({
    id: 'hn-1',
    source: 'hn',
    title: 'Contact me@example.com',
    url: 'https://example.com/share?token=secret',
    summary: 'Private environment details',
    publishedAt: '2026-09-22T00:00:00Z',
    commentsUrl: 'https://news.ycombinator.com/item?id=1&sig=secret',
  });

  assert.equal(article.title, 'Contact [redacted email]');
  assert.equal(article.url, 'https://example.com/share');
  assert.equal(article.summary, undefined);
  assert.equal(article.commentsUrl, 'https://news.ycombinator.com/item?id=1');
});

test('sanitizeArticle keeps sanitized editorial summaries', () => {
  const article = sanitizeArticle({
    id: 'bbc-1',
    source: 'bbc',
    title: 'Cloud report',
    url: 'https://example.com/report',
    summary: 'Affected host: storage.file.core.windows.net',
    publishedAt: '2026-09-22T00:00:00Z',
  });

  assert.equal(article.summary, 'Affected host: [redacted cloud hostname]');
});
