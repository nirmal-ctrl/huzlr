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
      if (response.status === 401 || response.status === 403) throw new Error('TOKEN_PERMISSION: check Blog and Tag find/findOne/create permissions.');
      if (!response.ok) throw new Error('CMS HTTP ' + response.status);
      return await response.json();
    } catch (error) {
      if (error.message.startsWith('TOKEN_PERMISSION:') || attempt === 7) throw error;
      await pause(10000);
    }
  }
}

async function resolveTags(tags) {
  if (!Array.isArray(tags) || tags.length < 2 || tags.length > 4) throw new Error('Provide 2–4 relevant tags as { title, slug }.');
  const ids = [];
  const slugs = new Set();
  for (const tag of tags) {
    if (!tag || typeof tag.title !== 'string' || !tag.title.trim() ||
        typeof tag.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag.slug)) {
      throw new Error('Each tag needs a title and lowercase hyphenated slug.');
    }
    if (slugs.has(tag.slug)) continue;
    slugs.add(tag.slug);
    const url = base + '/api/tags?' + new URLSearchParams({
      'filters[slug][$eq]': tag.slug, status: 'published', 'pagination[pageSize]': '2'
    });
    let found = await get(url);
    if (!Array.isArray(found.data)) throw new Error('Invalid tag response.');
    if (found.data.length > 1) throw new Error('Duplicate published tag slug: ' + tag.slug);
    let record = found.data[0];
    if (!record) {
      const drafts = await get(base + '/api/tags?' + new URLSearchParams({
        'filters[slug][$eq]': tag.slug, status: 'draft', 'pagination[pageSize]': '1'
      }));
      if (drafts.data?.length) throw new Error('Tag exists as a draft: ' + tag.slug + '. Publish it in Strapi before retrying.');
      try {
        const response = await fetch(base + '/api/tags?status=published', {
          method: 'POST', headers,
          body: JSON.stringify({ data: { title: tag.title.trim(), slug: tag.slug } }),
          signal: AbortSignal.timeout(90000)
        });
        if (!response.ok) throw new Error('Tag create HTTP ' + response.status + '; enable Tag create permission.');
        const result = await response.json();
        record = result.data;
        if (!record?.publishedAt) throw new Error('Tag publication was not confirmed.');
      } catch (error) {
        found = await get(url);
        record = found.data?.[0];
        if (!record?.publishedAt) throw error;
      }
    }
    if (!record.documentId) throw new Error('Tag documentId missing.');
    ids.push(record.documentId);
  }
  return ids;
}


async function uploadCover(input, slug) {
  if (typeof input.coverImagePath !== 'string' ||
      !/^huzlr-cms\/articles\/images\/[a-z0-9-]+\.json$/.test(input.coverImagePath)) {
    throw new Error('Provide coverImagePath inside huzlr-cms/articles/images.');
  }
  const asset = JSON.parse(readFileSync(input.coverImagePath, 'utf8'));
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(asset.mimeType) ||
      typeof asset.base64 !== 'string' || typeof asset.altText !== 'string' || !asset.altText.trim()) {
    throw new Error('Cover asset requires mimeType, base64, and descriptive altText.');
  }
  const bytes = Buffer.from(asset.base64, 'base64');
  if (bytes.length < 100 || bytes.length > 15 * 1024 * 1024) throw new Error('Cover image must be between 100 bytes and 15 MB.');
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[asset.mimeType];
  const form = new FormData();
  form.append('files', new Blob([bytes], { type: asset.mimeType }), slug + '.' + extension);
  form.append('fileInfo', JSON.stringify({ name: slug + '.' + extension, alternativeText: asset.altText.trim(), caption: '' }));
  // An interrupted upload may have succeeded; do not blindly retry it.
  const response = await fetch(base + '/api/upload', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form,
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) throw new Error('Cover upload HTTP ' + response.status + '; check Upload upload permission.');
  const media = await response.json();
  if (!Array.isArray(media) || !Number.isInteger(media[0]?.id) || !media[0]?.url) throw new Error('Cover upload was not confirmed.');
  if (media[0].alternativeText !== asset.altText.trim()) throw new Error('Cover alt text was not saved.');
  return media[0].id;
}

const recent = await get(base + '/api/blogs?status=published&pagination[pageSize]=1');
if (!Array.isArray(recent.data)) throw new Error('Unexpected CMS response.');
const tagAccess = await get(base + '/api/tags?status=published&pagination[pageSize]=1');
if (!Array.isArray(tagAccess.data)) throw new Error('Unexpected Tag API response.');
console.log('CMS connection, Blog read, and Tag read permissions verified.');
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
    'filters[slug][$eq]': data.slug, status: 'published', 'pagination[pageSize]': '1', 'populate[tags]': 'true', 'populate[coverImage]': 'true'
  });
  const existing = await get(lookupUrl);
  if (!Array.isArray(existing.data)) throw new Error('Unexpected duplicate lookup response.');
  if (existing.data.length) {
    console.log('Already published: ' + data.slug);
    continue;
  }
  const tagIds = await resolveTags(input.tags);
  data.tags = { connect: tagIds };
  data.coverImage = await uploadCover(input, data.slug);
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
  const linkedTags = verified.data[0]?.tags?.map(tag => tag.documentId) ?? [];
  if (!tagIds.every(id => linkedTags.includes(id))) throw new Error('Published blog tags could not be verified.');
  if (verified.data[0]?.coverImage?.id !== data.coverImage) throw new Error('Cover image attachment could not be verified.');
  const url = 'https://www.huzlr.com/blog/' + data.slug;
  console.log('Published and verified in CMS: ' + url);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '- Published: [' + data.title + '](' + url + ')\n');
}
