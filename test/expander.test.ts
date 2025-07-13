import { describe, it, expect, vi } from 'vitest';
import { expandAll } from '../src/expander';

describe('expander', () => {
  it('should not throw when run in jsdom', () => {
    expect(() => expandAll()).not.toThrow();
  });
});