/**
 * Download each creature's rendered AoN page into a local cache.
 *
 * The Elasticsearch index that `fetch-aon` reads omits the third stat-block
 * column: offensive abilities, breath weapons, afflictions, and attack traits
 * (agile, reach…). Those only exist in the server-rendered HTML page, so
 * `fetch-aon.mjs` merges them in from this cache when it is present.
 *
 * Usage: node scripts/fetch-aon-pages.mjs   (after the ES fetch; skips cached pages)
 *   AON_PAGES_DIR  cache directory (default /tmp/aon_pages)
 *   AON_PAGE_DELAY_MS  delay between requests (default 250)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

const RAW = '/tmp/aon_creatures_raw.json';
const DIR = process.env.AON_PAGES_DIR || '/tmp/aon_pages';
const DELAY = Number(process.env.AON_PAGE_DELAY_MS || 250);
const BASE = 'https://2e.aonsrd.com';

const hits = JSON.parse(readFileSync(RAW, 'utf-8')).hits?.hits || [];
mkdirSync(DIR, { recursive: true });

let fetched = 0, cached = 0, failed = 0;
for (const hit of hits) {
  const url = hit._source?.url;
  if (!url) continue;
  const file = join(DIR, `${hit._id}.html`);
  if (existsSync(file) && statSync(file).size > 5000) { cached++; continue; }
  try {
    const res = await fetch(BASE + url, { headers: { 'User-Agent': 'damoritoshs-arena data refresh' } });
    const html = await res.text();
    if (!res.ok || html.length < 5000) { failed++; console.warn('bad page', hit._id, res.status); continue; }
    writeFileSync(file, html);
    fetched++;
  } catch (err) {
    failed++;
    console.warn('failed', hit._id, err.message);
  }
  await new Promise(r => setTimeout(r, DELAY));
}
console.log(`Pages: ${fetched} fetched, ${cached} cached, ${failed} failed → ${DIR}`);
