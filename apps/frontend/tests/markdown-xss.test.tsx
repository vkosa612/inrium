import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MarkdownContent from '@/components/MarkdownContent';

function render(markdown: string): string {
  return renderToStaticMarkup(<MarkdownContent content={markdown} />);
}

describe('MarkdownContent: захист від XSS у користувацькому контенті', () => {
  it('сирий <script> не потрапляє в розмітку як елемент', () => {
    const html = render('Привіт <script>alert(1)</script> світ');
    expect(html).not.toMatch(/<script/i);
  });

  it('обробники подій у HTML не виконуються (<img onerror>)', () => {
    const html = render('<img src=x onerror="alert(1)">');
    expect(html).not.toMatch(/<img[^>]*onerror/i);
  });

  it.each([
    ['[клік](javascript:alert(1))'],
    ['[клік](JaVaScRiPt:alert(1))'],
    ['[клік](vbscript:msgbox(1))'],
    ['[клік](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)'],
  ])('небезпечне посилання %s нейтралізується', (md) => {
    const html = render(md);
    expect(html).not.toMatch(/href="\s*(javascript|vbscript|data):/i);
  });

  it('javascript: у src зображення нейтралізується', () => {
    const html = render('![x](javascript:alert(1))');
    expect(html).not.toMatch(/src="\s*javascript:/i);
  });

  it('зовнішні посилання відкриваються з rel="noopener noreferrer"', () => {
    const html = render('[сайт](https://example.com)');
    expect(html).toMatch(/rel="noopener noreferrer"/);
    expect(html).toMatch(/target="_blank"/);
  });

  it('<iframe>/<style> не рендеряться', () => {
    const html = render('<iframe src="https://evil.example"></iframe><style>body{display:none}</style>');
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<style/i);
  });
});
