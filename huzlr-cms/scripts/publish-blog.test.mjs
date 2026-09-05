import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBlogData,
  inferMarkdownFields,
  markdownToBlocks,
  parseArguments,
  publishBlog,
  slugify,
} from './publish-blog.mjs';

test('slugify creates a URL-safe blog slug', () => {
  assert.equal(slugify('  AI Project Management: What’s Next?  '), 'ai-project-management-what-s-next');
});

test('Markdown fields and supported blocks are converted for the Huzlr renderer', () => {
  const markdown = `# A Useful Article

This is the article summary.

## Why it matters

> A concise observation.

- First point
- Second **important** point

1. Start here
2. Finish there
`;

  assert.deepEqual(inferMarkdownFields(markdown), {
    title: 'A Useful Article',
    description: 'This is the article summary.',
  });
  assert.deepEqual(markdownToBlocks(markdown, { skipFirstH1: true }), [
    { type: 'paragraph', children: [{ type: 'text', text: 'This is the article summary.' }] },
    { type: 'heading', level: 2, children: [{ type: 'text', text: 'Why it matters' }] },
    { type: 'quote', children: [{ type: 'text', text: 'A concise observation.' }] },
    {
      type: 'list',
      format: 'unordered',
      children: [
        { type: 'list-item', children: [{ type: 'text', text: 'First point' }] },
        { type: 'list-item', children: [{ type: 'text', text: 'Second important point' }] },
      ],
    },
    {
      type: 'list',
      format: 'ordered',
      children: [
        { type: 'list-item', children: [{ type: 'text', text: 'Start here' }] },
        { type: 'list-item', children: [{ type: 'text', text: 'Finish there' }] },
      ],
    },
  ]);
});

test('buildBlogData validates fields and connects optional CMS records', () => {
  const data = buildBlogData(
    {
      title: 'Ship Better',
      description: 'A practical guide.',
      content: '## Begin\n\nDo the work.',
      authorDocumentId: 'author-doc',
      tagDocumentIds: ['tag-one', 'tag-two'],
      coverImageId: 7,
    },
    {},
    new Date('2026-09-05T10:00:00.000Z'),
  );

  assert.equal(data.slug, 'ship-better');
  assert.equal(data.publishDate, '2026-09-05T10:00:00.000Z');
  assert.deepEqual(data.author, { connect: ['author-doc'] });
  assert.deepEqual(data.tags, { connect: ['tag-one', 'tag-two'] });
  assert.equal(data.coverImage, 7);
});

test('parseArguments supports repeatable tags and overrides', () => {
  assert.deepEqual(
    parseArguments(['post.md', '--slug', 'custom', '--tag', 'one', '--tag', 'two', '--dry-run']),
    { tags: ['one', 'two'], inputPath: 'post.md', slug: 'custom', dryRun: true },
  );
});

test('publishBlog sends a published Strapi 5 request', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({
        data: {
          documentId: 'blog-doc',
          title: 'Ship Better',
          slug: 'ship-better',
          publishedAt: '2026-09-05T10:00:01.000Z',
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await publishBlog({
    cmsUrl: 'https://cms.example.com/',
    token: 'secret-token',
    data: { title: 'Ship Better' },
    fetchImpl,
  });

  assert.equal(request.url, 'https://cms.example.com/api/blogs?status=published');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer secret-token');
  assert.deepEqual(JSON.parse(request.options.body), { data: { title: 'Ship Better' } });
  assert.equal(result.documentId, 'blog-doc');
});

test('publishBlog surfaces Strapi errors', async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: { message: 'Forbidden' } }), {
      status: 403,
      statusText: 'Forbidden',
    });

  await assert.rejects(
    publishBlog({ cmsUrl: 'https://cms.example.com', token: 'bad', data: {}, fetchImpl }),
    /CMS request failed \(403 Forbidden\): Forbidden/,
  );
});
