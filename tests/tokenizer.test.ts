import { describe, expect, it } from 'vitest';
import { sanitizeText, tokenize } from '../src/tokenizer.js';
import { buildStopWordSet } from '../src/stopwords.js';

describe('Tokenizer & Sanitization Specification (SDD)', () => {
  it('should sanitize HTML tags and markdown markup', () => {
    const raw = `
# Title Heading
Here is a paragraph with <span class="highlight">HTML tags</span> and [a link](https://example.com).
\`\`\`javascript
const foo = "bar";
\`\`\`
And inline \`code block\`.
![Image](https://example.com/pic.png)
`;
    const clean = sanitizeText(raw);
    expect(clean).not.toContain('<span');
    expect(clean).not.toContain('https://example.com');
    expect(clean).not.toContain('const foo');
    expect(clean).toContain('Title Heading');
    expect(clean).toContain('HTML tags');
    expect(clean).toContain('a link');
  });

  it('should tokenize Chinese text accurately using Intl.Segmenter', () => {
    const text = '深入浅出TypeScript与Node.js多线程高并发架构设计与实践';
    const tokens = tokenize(text, { locale: 'zh-CN' });
    expect(tokens).toContain('typescript');
    expect(tokens).toContain('node.js');
    expect(tokens).toContain('并发');
    expect(tokens).toContain('架构');
    expect(tokens).toContain('设计');
    expect(tokens).toContain('实践');
  });

  it('should filter out stop words in Chinese and English', () => {
    const text = '这是关于一个非常好的技术实践，在Node.js中的应用 and for the best architecture';
    const tokens = tokenize(text, { locale: 'zh-CN' });
    expect(tokens).not.toContain('这是');
    expect(tokens).not.toContain('一个');
    expect(tokens).not.toContain('在');
    expect(tokens).not.toContain('的');
    expect(tokens).not.toContain('and');
    expect(tokens).not.toContain('for');
    expect(tokens).not.toContain('the');
    expect(tokens).toContain('技术');
    expect(tokens).toContain('实践');
    expect(tokens).toContain('node.js');
    expect(tokens).toContain('architecture');
  });

  it('should preserve reserved words intact', () => {
    const text = '使用 ASP.NET Core 和 C++ 开发高性能微服务，配合 Vue.js 前端';
    const tokens = tokenize(text, {
      locale: 'zh-CN',
      reserved: ['ASP.NET', 'C++', 'Vue.js'],
    });

    expect(tokens).toContain('asp.net');
    expect(tokens).toContain('c++');
    expect(tokens).toContain('vue.js');
    expect(tokens).not.toContain('asp');
    expect(tokens).not.toContain('net');
  });

  it('should support custom stop words extension', () => {
    const customStopWords = buildStopWordSet(['customword', 'foobar']);
    const text = 'Testing customword with normal words and foobar';
    const tokens = tokenize(text, {
      locale: 'en-US',
      stopWords: customStopWords,
    });
    expect(tokens).not.toContain('customword');
    expect(tokens).not.toContain('foobar');
    expect(tokens).toContain('testing');
    expect(tokens).toContain('normal');
    expect(tokens).toContain('words');
  });
});
