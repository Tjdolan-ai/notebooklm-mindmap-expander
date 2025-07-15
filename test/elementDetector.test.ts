
import { describe, it, expect, beforeEach } from 'vitest';
import { waitForContainer, CONTAINER_SELECTORS } from '../src/elementDetector';

describe('elementDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds the first matching selector', async () => {
    const el = document.createElement('div');
    el.className = 'MindMapViewer123';
    document.body.appendChild(el);
    const found = await waitForContainer(500, 50);
    expect(found).toBe(el);
  });

  it('returns null if no container after timeout', async () => {
    const found = await waitForContainer(200, 50);
    expect(found).toBeNull();
  });

  it('tries all selectors in order', async () => {
    // Add a container matching the 3rd selector
    const el = document.createElement('div');
    el.id = 'mind-map-container';
    document.body.appendChild(el);
    const found = await waitForContainer(500, 50);
    expect(found).toBe(el);
  });

  it('ignores selector errors', async () => {
    // Add a selector that throws (simulate by adding a non-element node)
    const comment = document.createComment('not an element');
    document.body.appendChild(comment);
    // Add a valid container
    const el = document.createElement('div');
    el.className = 'MindMapViewer';
    document.body.appendChild(el);
    const found = await waitForContainer(500, 50);
    expect(found).toBe(el);
  });

  it('exports CONTAINER_SELECTORS', () => {
    expect(Array.isArray(CONTAINER_SELECTORS)).toBe(true);
    expect(CONTAINER_SELECTORS.length).toBeGreaterThan(1);
  });
});
