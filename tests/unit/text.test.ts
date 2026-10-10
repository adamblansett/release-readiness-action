import { describe, it, expect } from 'vitest';
import { getLocationFromIndex, truncateText } from '../../src/utils/text.js';

describe('Text Utilities', () => {
  describe('getLocationFromIndex', () => {
    it('returns line 1 column 1 for index 0', () => {
      const text = 'hello world';
      const loc = getLocationFromIndex(text, 0);
      expect(loc.line).toBe(1);
      expect(loc.column).toBe(1);
      expect(loc.lineSnippet).toBe('hello world');
    });

    it('calculates line and column across multiple lines', () => {
      const text = 'line one\nline two\nline three';
      const index = text.indexOf('two');
      const loc = getLocationFromIndex(text, index);

      expect(loc.line).toBe(2);
      expect(loc.column).toBe(6); // 'line ' is 5 chars + 1
      expect(loc.lineSnippet).toBe('line two');
    });

    it('handles out of bounds index safely', () => {
      const text = 'sample';
      const loc = getLocationFromIndex(text, 100);
      expect(loc.line).toBe(1);
      expect(loc.column).toBe(1);
    });
  });

  describe('truncateText', () => {
    it('does not truncate text shorter than maxLength', () => {
      expect(truncateText('hello', 10)).toBe('hello');
    });

    it('truncates text longer than maxLength and appends indicator', () => {
      const longText = '1234567890abcdefghij';
      const result = truncateText(longText, 10);
      expect(result.startsWith('1234567890... [truncated 10 chars]')).toBe(true);
    });
  });
});
