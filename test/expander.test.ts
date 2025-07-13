import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { expandAll, collapseAll } from '../src/expander';

// Mock the global DOM environment
beforeEach(() => {
  vi.stubGlobal('document', {
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(),
    getElementById: vi.fn(),
    createElement: vi.fn(() => ({
      style: {},
      addEventListener: vi.fn(),
    })),
    body: {
      appendChild: vi.fn(),
    },
    contains: vi.fn(() => true),
  });
  vi.stubGlobal('window', {
    setTimeout: vi.fn((fn: () => void) => fn() as any),
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
  });
  vi.stubGlobal('MutationObserver', class {
    constructor() {}
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('expander', () => {
  it('should not throw when run in a mocked DOM', () => {
    expect(() => expandAll()).not.toThrow();
    expect(() => collapseAll()).not.toThrow();
  });

  it('should click the toolbar expand button if available', () => {
    const mockButton = { click: vi.fn() };
    vi.spyOn(document, 'querySelector').mockReturnValueOnce(mockButton as any);
    expandAll();
    expect(mockButton.click).toHaveBeenCalled();
  });

  it('should not throw when run in a mocked DOM', () => {
    expect(() => expandAll()).not.toThrow();
    expect(() => collapseAll()).not.toThrow();
  });
});