import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { buildBlogData } from './publish-blog.mjs';

const origin = process.env.HUZLR_CMS_URL;
const token = process.env.HUZLR_CMS_API_TOKEN;
if (!origin || !token) throw new Error('Configure HUZLR_CMS_URL and HUZLR_CMS_API_TOKEN in GitHub Actions.');
const base = origin.replace(/\/+$/, '').replace(/\/api$/, '');
if (new URL(base).protocol !== 'https:') throw new Error('CMS URL must use HTTPS.');
const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function get(url) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
      if (response.status === 401 || response.status === 403) throw new Error('TOKEN_PERMISSION: check Blog find/findOne/create permissions.');
      if (!response.ok) throw new Error('CMS HTTP ' + response.status);
      return await response.json();
    } catch (error) {
      if (error.message.startsWith('TOKEN_PERMISSION:') || attempt === 7) throw error;
      await pause(10000);
    }
  }
}
const recent = await get(base + '/api/blogs?status=published&pagination[pageSize]=1');
if (!Array.isArray(recent.data)) throw new Error('Unexpected CMS response.');
console.log('CMS connection and Blog read permission verified.');
if (process.argv.includes('--preflight')) process.exit(0);
const directory = 'huzlr-cms/articles';
const files = readdirSync(directory).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
for (const file of files) {
  const input = JSON.parse(readFileSync(directory + '/' + file, 'utf8'));
  const data = buildBlogData(input);
  if (data.description.length < 150 || data.description.length > 160) throw new Error(file + ': description must be 150–160 characters.');
  if (!data.contentMarkdown) throw new Error(file + ': Markdown required.');
  const links = [...data.contentMarkdown.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)];
  if (links.length < 2) throw new Error(file + ': at least two HTTPS sources required.');
  const lookupUrl = base + '/api/blogs?' + new URLSearchParams({
    'filters[slug][$eq]': data.slug, status: 'published', 'pagination[pageSize]': '1'
  });
  const existing = await get(lookupUrl);
  if (!Array.isArray(existing.data)) throw new Error('Unexpected duplicate lookup response.');
  if (existing.data.length) {
    console.log('Already published: ' + data.slug);
    continue;
  }
  // Never automatically repeat a POST: an interrupted response may have committed.
  let published;
  try {
    const response = await fetch(base + '/api/blogs?status=published', {
      method: 'POST', headers, body: JSON.stringify({ data }), signal: AbortSignal.timeout(90000)
    });
    if (!response.ok) throw new Error('Publish HTTP ' + response.status);
    const result = await response.json();
    if (!result.data?.publishedAt) throw new Error('Publication was not confirmed.');
    published = result.data;
  } catch (error) {
    await pause(10000);
    const recovered = await get(lookupUrl);
    if (!recovered.data?.[0]?.publishedAt) throw new Error('Publication uncertain for ' + data.slug + ': ' + error.message + '. Inspect CMS before retrying.');
    published = recovered.data[0];
  }
  const verified = await get(lookupUrl);
  if (!verified.data?.some(post => post.documentId === published.documentId)) throw new Error('Published article could not be verified.');
  const url = 'https://www.huzlr.com/blog/' + data.slug;
  console.log('Published and verified in CMS: ' + url);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '- Published: [' + data.title + '](' + url + ')\n');
}
