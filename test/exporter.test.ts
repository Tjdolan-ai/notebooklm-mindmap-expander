import { describe, it, expect } from 'vitest';
import { exportToMarkdown } from '../src/exporter';

describe('Exporter', () => {
  it('should convert HTML to Markdown correctly', () => {
    const html = '<h1>Hello</h1><p>This is a test.</p>';
    const expectedMarkdown = '# Hello\\n\\nThis is a test.';
    const result = exportToMarkdown(html);
    expect(result).toBe(expectedMarkdown);
  });
});
