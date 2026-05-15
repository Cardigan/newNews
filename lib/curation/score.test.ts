import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { countMatches, engagementBonus, recencyBonus, scoreArticle } from './score';
import type { RawArticle } from './types';

test('countMatches finds whole-word and phrase matches', () => {
  const r = countMatches(
    'Microsoft Fabric and Power Query Online ship new connector',
    ['microsoft fabric', 'power query', 'connector', 'snowflake'],
  );
  assert.equal(r.count, 3);
  assert.deepEqual(r.hits.sort(), ['connector', 'microsoft fabric', 'power query']);
});

test('countMatches does not match substrings of words', () => {
  const r = countMatches('the cat sat on the mat', ['at']);
  assert.equal(r.count, 0);
});

test('recencyBonus decays with age', () => {
  const now = Date.parse('2026-05-15T12:00:00Z');
  const fresh = recencyBonus('2026-05-15T11:00:00Z', now);
  const old = recencyBonus('2026-05-13T12:00:00Z', now);
  assert.ok(fresh > old);
  assert.ok(fresh > 4);
  assert.ok(old < 1);
});

test('engagementBonus is log-scaled and capped', () => {
  assert.equal(engagementBonus(0), 0);
  assert.ok(engagementBonus(10) > 0);
  assert.ok(engagementBonus(1_000_000) <= 4);
});

test('scoreArticle tags roles and products and computes a positive score', () => {
  const a: RawArticle = {
    id: 'x',
    source: 'guardian',
    title: 'Microsoft Fabric Data Factory pipelines reach general availability',
    url: 'https://example.com/x',
    summary: 'New connector and OneLake integration for enterprise customers.',
    publishedAt: new Date().toISOString(),
    engagement: 250,
  };
  const s = scoreArticle(a);
  assert.ok(s.products.includes('fabric'));
  assert.ok(s.products.includes('data-factory'));
  assert.ok(s.products.includes('onelake'));
  assert.ok(s.roles.length > 0);
  assert.ok(s.score > 10);
});

test('noise terms reduce score', () => {
  const base: RawArticle = {
    id: 'n',
    source: 'bbc',
    title: 'Azure announcement',
    url: 'https://example.com/n',
    publishedAt: new Date().toISOString(),
  };
  const clean = scoreArticle(base);
  const noisy = scoreArticle({ ...base, title: 'Azure announcement at football match' });
  assert.ok(noisy.score < clean.score);
});
