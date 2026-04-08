'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold" style={{ color: '#E2E8F0' }}>
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em style={{ color: '#A78BFA' }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mb-2 text-lg font-bold" style={{ color: '#E2E8F0' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 text-base font-bold" style={{ color: '#E2E8F0' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 text-base font-bold" style={{ color: '#A78BFA' }}>
      {children}
    </h3>
  ),
  blockquote: ({ children }) => (
    <blockquote
      className="my-2 pl-3"
      style={{ borderLeft: '2px solid #7C3AED', color: '#94A3B8' }}
    >
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code
      className="rounded px-1 py-0.5 text-sm"
      style={{ backgroundColor: '#1E1E3F', color: '#A78BFA' }}
    >
      {children}
    </code>
  ),
};

interface MarkdownContentProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MarkdownContent({
  content,
  className = '',
  style,
}: MarkdownContentProps) {
  return (
    <div
      className={`text-base leading-relaxed break-words ${className}`}
      style={{ fontFamily: 'var(--font-pixel-body)', color: '#CBD5E1', ...style }}
    >
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
