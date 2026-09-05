#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CMS_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_CMS_URL = 'http://127.0.0.1:1337';

const HELP = `Publish a blog post to the Huzlr CMS.

Usage:
  npm run publish:blog -- <article.md|article.json> [options]

Options:
  --title <text>             Override the title (Markdown: first H1 by default)
  --description <text>       Override the description (first paragraph by default)
  --slug <slug>              Override the generated slug
  --publish-date <date>      ISO date/time (defaults to now)
  --author <document-id>     Connect a Strapi author by documentId
  --tag <document-id>        Connect a tag; repeat this option for multiple tags
  --cover-image-id <id>      Connect an existing Strapi media item by numeric id
  --dry-run                  Print the request without publishing
  -h, --help                 Show this help

Environment (loaded from huzlr-cms/.env when present):
  HUZLR_CMS_API_TOKEN        Required API token with Blog create permission
  HUZLR_CMS_URL              CMS origin (default: http://127.0.0.1:1337)
  HUZLR_SITE_URL             Optional site origin printed after publishing
`;

export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inlineText(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|\s)(\*|_)([^*_]+)\2(?=\s|[.,!?;:]|$)/g, '$1$3')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/** Remove the H1 used as the entry title while preserving the remaining Markdown. */
export function stripFirstMarkdownH1(markdown) {
  return markdown.replace(/^#\s+.*(?:\r?\n|$)/m, '');
}

export function inferMarkdownFields(markdown) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const paragraph = markdown
    .replace(/^#\s+.+$/m, '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .find((part) => part && !/^(#{1,6}\s|>|[-+*]\s|\d+\.\s)/.test(part));

  return {
    title: title ? inlineText(title) : undefined,
    description: paragraph ? inlineText(paragraph.replace(/\s*\n\s*/g, ' ')) : undefined,
  };
}

export function parseArguments(argv) {
  const options = { tags: [] };
  const valueOptions = new Map([
    ['--title', 'title'],
    ['--description', 'description'],
    ['--slug', 'slug'],
    ['--publish-date', 'publishDate'],
    ['--author', 'authorDocumentId'],
    ['--cover-image-id', 'coverImageId'],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--tag') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) throw new Error('--tag requires a documentId.');
      options.tags.push(value);
      index += 1;
    } else if (valueOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) throw new Error(`${argument} requires a value.`);
      options[valueOptions.get(argument)] = value;
      index += 1;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (!options.inputPath) {
      options.inputPath = argument;
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }

  return options;
}

function readInput(inputPath) {
  const absolutePath = resolve(process.cwd(), inputPath);
  let source;
  try {
    source = readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(`Could not read ${absolutePath}: ${error.message}`);
  }

  if (extname(absolutePath).toLowerCase() === '.json') {
    try {
      return JSON.parse(source);
    } catch (error) {
      throw new Error(`Invalid JSON in ${absolutePath}: ${error.message}`);
    }
  }

  const inferred = inferMarkdownFields(source);
  return { ...inferred, contentMarkdown: stripFirstMarkdownH1(source) };
}

function cleanString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Blog ${field} must be a non-empty string.`);
  }
  return value.trim();
}

export function buildBlogData(input, overrides = {}, now = new Date()) {
  const title = cleanString(overrides.title ?? input.title, 'title');
  const description = cleanString(overrides.description ?? input.description, 'description');
  const slug = slugify(overrides.slug ?? input.slug ?? title);
  if (!slug) throw new Error('Blog slug must contain at least one letter or number.');

  const legacyContent = input.content;
  const rawContentMarkdown = input.contentMarkdown ??
    (typeof legacyContent === 'string' ? legacyContent : undefined);
  const contentMarkdown = rawContentMarkdown === undefined
    ? undefined
    : cleanString(rawContentMarkdown, 'contentMarkdown');
  const content = Array.isArray(legacyContent) ? legacyContent : undefined;

  if (legacyContent !== undefined && typeof legacyContent !== 'string' && !Array.isArray(legacyContent)) {
    throw new Error('Blog content must be a non-empty Strapi Blocks array when provided.');
  }
  if (content && content.length === 0) {
    throw new Error('Blog content must be a non-empty Strapi Blocks array when provided.');
  }
  if (!contentMarkdown && !content) {
    throw new Error(
      'Blog contentMarkdown must be a non-empty Markdown string, or content must be a non-empty Strapi Blocks array.',
    );
  }

  const rawPublishDate = overrides.publishDate ?? input.publishDate ?? now.toISOString();
  const parsedPublishDate = new Date(rawPublishDate);
  if (Number.isNaN(parsedPublishDate.getTime())) {
    throw new Error(`Invalid publish date: ${rawPublishDate}`);
  }

  const data = {
    title,
    slug,
    description,
    publishDate: parsedPublishDate.toISOString(),
  };
  if (contentMarkdown) data.contentMarkdown = contentMarkdown;
  if (content) data.content = content;

  const authorDocumentId = overrides.authorDocumentId ?? input.authorDocumentId;
  if (authorDocumentId) data.author = { connect: [authorDocumentId] };

  const tagDocumentIds = overrides.tags?.length ? overrides.tags : input.tagDocumentIds;
  if (tagDocumentIds !== undefined) {
    if (!Array.isArray(tagDocumentIds) || tagDocumentIds.some((id) => typeof id !== 'string' || !id)) {
      throw new Error('tagDocumentIds must be an array of non-empty Strapi document IDs.');
    }
    if (tagDocumentIds.length) data.tags = { connect: tagDocumentIds };
  }

  const rawCoverImageId = overrides.coverImageId ?? input.coverImageId;
  if (rawCoverImageId !== undefined) {
    const coverImageId = Number(rawCoverImageId);
    if (!Number.isInteger(coverImageId) || coverImageId <= 0) {
      throw new Error('coverImageId must be a positive integer.');
    }
    data.coverImage = coverImageId;
  }

  return data;
}

function blogsEndpoint(cmsUrl) {
  const base = cmsUrl.replace(/\/+$/, '');
  return `${base.endsWith('/api') ? base : `${base}/api`}/blogs?status=published`;
}

export async function publishBlog({ cmsUrl, token, data, fetchImpl = fetch }) {
  const endpoint = blogsEndpoint(cmsUrl);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(`Could not reach the Huzlr CMS at ${endpoint}: ${error.message}`);
  }

  const bodyText = await response.text();
  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = {};
  }

  if (!response.ok) {
    const apiMessage = body?.error?.message || bodyText || response.statusText;
    throw new Error(`CMS request failed (${response.status} ${response.statusText}): ${apiMessage}`);
  }
  if (!body?.data?.publishedAt) {
    throw new Error('The CMS created the blog but did not confirm publication (publishedAt is missing).');
  }
  return body.data;
}

function loadLocalEnv() {
  const envPath = resolve(CMS_ROOT, '.env');
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

async function main() {
  loadLocalEnv();
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (!options.inputPath) throw new Error(`Missing article path.\n\n${HELP}`);

  const input = readInput(options.inputPath);
  const data = buildBlogData(input, options);
  const cmsUrl = process.env.HUZLR_CMS_URL || process.env.NEXT_PUBLIC_STRAPI_URL || DEFAULT_CMS_URL;
  try {
    new URL(cmsUrl);
  } catch {
    throw new Error(`HUZLR_CMS_URL is not a valid URL: ${cmsUrl}`);
  }

  if (options.dryRun) {
    console.log(JSON.stringify({ endpoint: blogsEndpoint(cmsUrl), body: { data } }, null, 2));
    return;
  }

  const token = process.env.HUZLR_CMS_API_TOKEN || process.env.STRAPI_API_TOKEN;
  if (!token?.trim()) {
    throw new Error('Missing HUZLR_CMS_API_TOKEN. Add it to huzlr-cms/.env or export it in your shell.');
  }

  const published = await publishBlog({ cmsUrl, token: token.trim(), data });
  console.log(`Published "${published.title || data.title}" successfully.`);
  console.log(`Document ID: ${published.documentId}`);
  console.log(`Published at: ${published.publishedAt}`);

  if (process.env.HUZLR_SITE_URL) {
    const siteUrl = process.env.HUZLR_SITE_URL.replace(/\/+$/, '');
    console.log(`Blog URL: ${siteUrl}/blog/${published.slug || data.slug}`);
  }
}

const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  });
}
