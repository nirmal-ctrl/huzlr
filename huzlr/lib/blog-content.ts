import type {
  StrapiBlock,
  StrapiBlocksContent,
  StrapiBlogContent,
  StrapiParagraphBlock,
  StrapiTextNode,
} from '@/services/strapiApi';

const MARKDOWN_SYNTAX =
  /(?:^|\n)\s{0,3}(?:#{1,6}\s+\S|>\s+\S|(?:[-+*]|\d+[.)])\s+\S|`{3,}|~{3,}|(?:-{3,}|\*{3,}|_{3,})\s*$)|!?\[[^\]\n]*\]\([^\n)]+\)|(?:\*\*|__|~~|`)[^\n]+?(?:\*\*|__|~~|`)/m;

const TEXT_MODIFIERS: Array<keyof StrapiTextNode> = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'code',
];

type PlainParagraphBlock = Omit<StrapiParagraphBlock, 'children'> & {
  children: StrapiTextNode[];
};

function isPlainTextNode(node: unknown): node is StrapiTextNode {
  if (!node || typeof node !== 'object') return false;

  const candidate = node as Partial<StrapiTextNode>;
  return (
    candidate.type === 'text' &&
    typeof candidate.text === 'string' &&
    TEXT_MODIFIERS.every((modifier) => !candidate[modifier])
  );
}

function isPlainParagraph(block: unknown): block is PlainParagraphBlock {
  if (!block || typeof block !== 'object') return false;

  const candidate = block as Partial<StrapiParagraphBlock>;
  return (
    candidate.type === 'paragraph' &&
    Array.isArray(candidate.children) &&
    candidate.children.length > 0 &&
    candidate.children.every(isPlainTextNode)
  );
}

/**
 * Recover Markdown pasted into Strapi's Blocks editor as plain text.
 *
 * This deliberately accepts only paragraph blocks containing unmodified text.
 * Properly structured Blocks must continue through the Blocks renderer so links,
 * marks, lists, images, and other editor structure are not discarded.
 */
export function getMarkdownPastedIntoBlocks(
  content: StrapiBlogContent,
): string | null {
  if (!Array.isArray(content) || content.length === 0) return null;
  if (!content.every(isPlainParagraph)) return null;

  const paragraphs = content as PlainParagraphBlock[];

  // Strapi represents each pasted Markdown line as a paragraph, including blank
  // lines as paragraphs with an empty text node. A single newline therefore
  // reconstructs the source faithfully.
  const markdown = paragraphs
    .map((block) => block.children.map((child) => child.text).join(''))
    .join('\n')
    .trim();

  return markdown && MARKDOWN_SYNTAX.test(markdown) ? markdown : null;
}

/** Select the authored Markdown, while preserving compatibility with old data. */
export function getBlogMarkdownSource(
  contentMarkdown: string | null | undefined,
  content: StrapiBlogContent,
): string | null {
  const authoredMarkdown = contentMarkdown?.trim();
  if (authoredMarkdown) return authoredMarkdown;

  if (typeof content === 'string') {
    const legacyMarkdown = content.trim();
    return legacyMarkdown || null;
  }

  return getMarkdownPastedIntoBlocks(content);
}

function getNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  const candidate = node as {
    text?: unknown;
    children?: unknown;
    image?: { alternativeText?: unknown; caption?: unknown };
  };

  if (typeof candidate.text === 'string') return candidate.text;

  if (Array.isArray(candidate.children)) {
    return candidate.children.map(getNodeText).filter(Boolean).join(' ');
  }

  if (candidate.image) {
    if (typeof candidate.image.alternativeText === 'string') {
      return candidate.image.alternativeText;
    }
    if (typeof candidate.image.caption === 'string') return candidate.image.caption;
  }

  return '';
}

export function getBlocksPlainText(content: StrapiBlocksContent): string {
  return content.map((block: StrapiBlock) => getNodeText(block)).filter(Boolean).join('\n');
}

function normalizeTextForWordCount(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^\n)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+[.)])\s+/gm, '')
    .replace(/[`*_~|]/g, ' ');
}

export function getBlogContentPlainText(
  contentMarkdown: string | null | undefined,
  content: StrapiBlogContent,
): string {
  const markdown = getBlogMarkdownSource(contentMarkdown, content);
  if (markdown) return normalizeTextForWordCount(markdown);
  return Array.isArray(content) ? getBlocksPlainText(content) : '';
}

export function estimateBlogReadingTime(
  description: string | null | undefined,
  contentMarkdown: string | null | undefined,
  content: StrapiBlogContent,
  wordsPerMinute = 225,
): number {
  const text = [description ?? '', getBlogContentPlainText(contentMarkdown, content)]
    .join(' ')
    .trim();
  const wordCount = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;

  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
