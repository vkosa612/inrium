'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.25, marginTop: 40, marginBottom: 16, borderBottom: '1px solid #1e1e32', paddingBottom: 10 }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, marginTop: 36, marginBottom: 12, borderBottom: '1px solid #1a1a2e', paddingBottom: 8 }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4, marginTop: 28, marginBottom: 10 }}>{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 style={{ fontSize: 16, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.4, marginTop: 20, marginBottom: 8 }}>{children}</h4>
        ),
        p: ({ children }) => (
          <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.8, marginBottom: 20 }}>{children}</p>
        ),
        ul: ({ children }) => (
          <ul style={{ paddingLeft: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ paddingLeft: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, position: 'relative' }}>{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote style={{ borderLeft: '4px solid #a78bfa', paddingLeft: 20, marginLeft: 0, marginBottom: 20, color: '#94a3b8', fontStyle: 'italic', background: 'rgba(139,92,246,0.06)', borderRadius: '0 8px 8px 0', padding: '12px 20px', marginRight: 0 }}>
            {children}
          </blockquote>
        ),
        code: ({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode }) => {
          if (inline) {
            return (
              <code style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd', padding: '2px 6px', borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace' }} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code style={{ display: 'block', background: '#0f0f1a', border: '1px solid #1e1e32', color: '#c4b5fd', padding: '16px 20px', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.6, marginBottom: 20 }} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre style={{ background: '#0f0f1a', border: '1px solid #1e1e32', borderRadius: 8, overflowX: 'auto', marginBottom: 20 }}>
            {children}
          </pre>
        ),
        a: ({ href, children }) => (
          <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            style={{ color: '#a78bfa', textDecoration: 'underline', textDecorationColor: 'rgba(167,139,250,0.4)', textUnderlineOffset: 3 }}>
            {children}
          </a>
        ),
        hr: () => (
          <hr style={{ border: 'none', borderTop: '1px solid #1e1e32', margin: '32px 0' }} />
        ),
        strong: ({ children }) => (
          <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ color: '#a78bfa', fontStyle: 'italic' }}>{children}</em>
        ),
        table: ({ children }) => (
          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ background: 'rgba(139,92,246,0.1)' }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th style={{ padding: '10px 14px', textAlign: 'left', color: '#e2e8f0', fontWeight: 600, border: '1px solid #1e1e32', fontSize: 13 }}>{children}</th>
        ),
        td: ({ children }) => (
          <td style={{ padding: '8px 14px', color: '#94a3b8', border: '1px solid #1a1a2e', lineHeight: 1.5 }}>{children}</td>
        ),
        tr: ({ children }) => (
          <tr style={{ borderBottom: '1px solid #1a1a2e' }}>{children}</tr>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? ''} style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 20, border: '1px solid #1e1e32' }} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
