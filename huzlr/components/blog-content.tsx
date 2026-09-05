import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getBlogMarkdownSource } from '@/lib/blog-content';
import type {
  StrapiBlock,
  StrapiBlogContent,
  StrapiInlineNode,
  StrapiListItemNode,
  StrapiTextNode,
} from '@/services/strapiApi';

interface BlogContentProps {
  contentMarkdown?: string | null;
  content: StrapiBlogContent;
}

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

function safeUrl(value: string | undefined, allowRelative = true): string | null {
  if (!value) return null;
  if (allowRelative && (value.startsWith('/') || value.startsWith('#'))) return value;

  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function mediaUrl(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) {
    return `${STRAPI_URL.replace(/\/$/, '')}${value}`;
  }

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function inlinePlainText(nodes: StrapiInlineNode[]): string {
  return nodes
    .map((node) =>
      node.type === 'text'
        ? node.text
        : inlinePlainText(node.children),
    )
    .join('');
}

function renderTextNode(node: StrapiTextNode, key: string): ReactNode {
  let output: ReactNode = node.text;

  if (node.code) output = <code>{output}</code>;
  if (node.bold) output = <strong>{output}</strong>;
  if (node.italic) output = <em>{output}</em>;
  if (node.underline) output = <u>{output}</u>;
  if (node.strikethrough) output = <s>{output}</s>;

  return <span key={key}>{output}</span>;
}

function renderInlineNode(node: StrapiInlineNode, key: string): ReactNode {
  if (node.type === 'text') return renderTextNode(node, key);

  const href = safeUrl(node.url);
  const children = node.children.map((child, index) =>
    renderTextNode(child, `${key}-${index}`),
  );

  return href ? (
    <a key={key} href={href}>
      {children}
    </a>
  ) : (
    <span key={key}>{children}</span>
  );
}

function renderInlineNodes(nodes: StrapiInlineNode[], key: string): ReactNode[] {
  return nodes.map((node, index) => renderInlineNode(node, `${key}-${index}`));
}

function renderListItem(item: StrapiListItemNode, key: string): ReactNode {
  return (
    <li key={key}>
      {item.children.map((child, index) => {
        if (child.type === 'list') {
          return renderBlock(child, `${key}-list-${index}`);
        }
        return renderInlineNode(child, `${key}-inline-${index}`);
      })}
    </li>
  );
}

function renderBlock(block: StrapiBlock, key: string): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return <p key={key}>{renderInlineNodes(block.children, key)}</p>;
    case 'heading': {
      const children = renderInlineNodes(block.children, key);
      switch (block.level) {
        case 1:
          return <h2 key={key}>{children}</h2>;
        case 2:
          return <h2 key={key}>{children}</h2>;
        case 3:
          return <h3 key={key}>{children}</h3>;
        case 4:
          return <h4 key={key}>{children}</h4>;
        case 5:
          return <h5 key={key}>{children}</h5>;
        case 6:
          return <h6 key={key}>{children}</h6>;
      }
    }
    case 'quote':
      return <blockquote key={key}>{renderInlineNodes(block.children, key)}</blockquote>;
    case 'code':
      return (
        <pre key={key}>
          <code>{inlinePlainText(block.children)}</code>
        </pre>
      );
    case 'list': {
      const children = block.children.map((item, index) =>
        item.type === 'list-item'
          ? renderListItem(item, `${key}-${index}`)
          : renderBlock(item, `${key}-${index}`),
      );
      return block.format === 'ordered' ? (
        <ol key={key}>{children}</ol>
      ) : (
        <ul key={key}>{children}</ul>
      );
    }
    case 'image': {
      const src = mediaUrl(block.image.url);
      if (!src) return null;
      return (
        <figure key={key}>
          {/* CMS images can have arbitrary dimensions and remote origins. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={block.image.alternativeText || block.image.caption || ''}
            width={block.image.width || undefined}
            height={block.image.height || undefined}
            loading="lazy"
          />
          {block.image.caption && <figcaption>{block.image.caption}</figcaption>}
        </figure>
      );
    }
  }
}

function LegacyBlocks({ content }: { content: StrapiBlock[] }) {
  return <>{content.map((block, index) => renderBlock(block, `block-${index}`))}</>;
}

export function BlogContent({ contentMarkdown, content }: BlogContentProps) {
  const markdown = getBlogMarkdownSource(contentMarkdown, content);

  if (markdown) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          a: ({ href, children }) => {
            const safeHref = safeUrl(href);
            return safeHref ? <a href={safeHref}>{children}</a> : <span>{children}</span>;
          },
          img: ({ src, alt, title }) => {
            const resolvedSrc = mediaUrl(typeof src === 'string' ? src : undefined);
            if (!resolvedSrc) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolvedSrc} alt={alt || ''} title={title} loading="lazy" />
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    );
  }

  return Array.isArray(content) ? <LegacyBlocks content={content} /> : null;
}
